package ru.stankin.uits.module.publications;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import ru.stankin.uits.AbstractIntegrationTest;
import ru.stankin.uits.common.exception.InvalidRequestException;
import ru.stankin.uits.common.exception.ScholarUnavailableException;
import ru.stankin.uits.common.exception.TooManyRequestsException;
import ru.stankin.uits.module.publications.client.SerperScholarClient;
import ru.stankin.uits.module.publications.client.SerperScholarItem;
import ru.stankin.uits.module.publications.repository.ScholarSearchCacheRepository;
import ru.stankin.uits.module.publications.service.ScholarCallLimiter;
import ru.stankin.uits.module.publications.service.ScholarSearchService;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;

class ScholarSearchServiceIntegrationTest extends AbstractIntegrationTest {

    @MockitoBean
    private SerperScholarClient serperScholarClient;

    @MockitoBean
    private ScholarCallLimiter callLimiter;

    @Autowired
    private ScholarSearchService scholarSearchService;

    @Autowired
    private ScholarSearchCacheRepository cacheRepository;

    @Autowired
    private JdbcTemplate jdbc;

    @BeforeEach
    void stubClient() {
        given(serperScholarClient.search(anyString(), anyInt())).willReturn(List.of(
                SerperScholarItem.builder().title("Первая работа").year(2012).build(),
                SerperScholarItem.builder().title("Вторая работа").year(2018).build()));
    }

    @Test
    void repeatedSearchIsServedFromCache() {
        List<SerperScholarItem> first = scholarSearchService.search("Чеканин", 0);
        List<SerperScholarItem> second = scholarSearchService.search("Чеканин", 0);

        then(serperScholarClient).should(times(1)).search("чеканин", 0);
        assertThat(first).hasSize(2);
        assertThat(second).hasSize(2);
        assertThat(second.getFirst().getTitle()).isEqualTo("Первая работа");
        assertThat(second.getFirst().getYear()).isEqualTo(2012);
        assertThat(cacheRepository.count()).isEqualTo(1);
    }

    @Test
    void queriesDifferingOnlyByCaseAndSpacesShareOneRow() {
        scholarSearchService.search("  Чеканин   Владислав ", 0);
        scholarSearchService.search("чеканин владислав", 0);

        then(serperScholarClient).should(times(1)).search("чеканин владислав", 0);
        assertThat(cacheRepository.count()).isEqualTo(1);
    }

    @Test
    void anotherPageIsFetchedSeparately() {
        scholarSearchService.search("Чеканин", 0);
        scholarSearchService.search("Чеканин", 1);

        then(serperScholarClient).should(times(1)).search("чеканин", 0);
        then(serperScholarClient).should(times(1)).search("чеканин", 1);
        assertThat(cacheRepository.count()).isEqualTo(2);
    }

    @Test
    void staleRowIsRefetchedAndReplaced() {
        scholarSearchService.search("Чеканин", 0);
        jdbc.update("UPDATE scholar_search_cache SET fetched_at = ?", OffsetDateTime.now().minusDays(40));

        scholarSearchService.search("Чеканин", 0);

        then(serperScholarClient).should(times(2)).search("чеканин", 0);
        assertThat(cacheRepository.count()).isEqualTo(1);
        assertThat(cacheRepository.findByQueryAndPage("чеканин", 0))
                .get()
                .extracting(row -> row.getFetchedAt().isAfter(OffsetDateTime.now().minusDays(1)))
                .isEqualTo(true);
    }

    @Test
    void blankQueryIsRejectedWithoutCallingService() {
        assertThatThrownBy(() -> scholarSearchService.search("   ", 0))
                .isInstanceOf(InvalidRequestException.class);

        then(serperScholarClient).should(never()).search(anyString(), anyInt());
    }

    @Test
    void pageOutsideAllowedRangeIsRejectedWithoutCallingService() {
        assertThatThrownBy(() -> scholarSearchService.search("Чеканин", 3))
                .isInstanceOf(InvalidRequestException.class);

        then(serperScholarClient).should(never()).search(anyString(), anyInt());
    }

    @Test
    void emptyResponseIsRefetchedEarlierThanFilledOne() {
        given(serperScholarClient.search("чеканин", 0)).willReturn(List.of());
        scholarSearchService.search("Чеканин", 0);
        jdbc.update("UPDATE scholar_search_cache SET fetched_at = ?", OffsetDateTime.now().minusHours(2));

        scholarSearchService.search("Чеканин", 0);
        then(serperScholarClient).should(times(1)).search("чеканин", 0);

        jdbc.update("UPDATE scholar_search_cache SET fetched_at = ?", OffsetDateTime.now().minusDays(2));

        scholarSearchService.search("Чеканин", 0);
        then(serperScholarClient).should(times(2)).search("чеканин", 0);
    }

    @Test
    void filledResponseOutlivesEmptyTtl() {
        scholarSearchService.search("Чеканин", 0);
        jdbc.update("UPDATE scholar_search_cache SET fetched_at = ?", OffsetDateTime.now().minusDays(2));

        scholarSearchService.search("Чеканин", 0);

        then(serperScholarClient).should(times(1)).search("чеканин", 0);
    }

    @Test
    void concurrentIdenticalSearchesCallSerperOnce() throws Exception {
        CountDownLatch entered = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        given(serperScholarClient.search("чеканин", 0)).willAnswer(invocation -> {
            entered.countDown();
            release.await(5, TimeUnit.SECONDS);

            return List.of(SerperScholarItem.builder().title("Единственная работа").build());
        });

        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            Future<List<SerperScholarItem>> first = pool.submit(() -> scholarSearchService.search("Чеканин", 0));
            assertThat(entered.await(5, TimeUnit.SECONDS)).isTrue();
            AtomicReference<Thread> secondThread = new AtomicReference<>();
            Future<List<SerperScholarItem>> second = pool.submit(() -> {
                secondThread.set(Thread.currentThread());
                return scholarSearchService.search("  ЧЕКАНИН ", 0);
            });
            awaitParked(secondThread);
            release.countDown();

            assertThat(first.get(5, TimeUnit.SECONDS)).hasSize(1);
            assertThat(second.get(5, TimeUnit.SECONDS)).hasSize(1);
            then(serperScholarClient).should(times(1)).search("чеканин", 0);
            assertThat(cacheRepository.count()).isEqualTo(1);
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    void concurrentSearchesShareFailureAndDoNotCacheIt() throws Exception {
        CountDownLatch entered = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        given(serperScholarClient.search("чеканин", 0)).willAnswer(invocation -> {
            entered.countDown();
            release.await(5, TimeUnit.SECONDS);

            throw new ScholarUnavailableException("Google Scholar не отвечает.");
        });

        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            Future<List<SerperScholarItem>> first = pool.submit(() -> scholarSearchService.search("Чеканин", 0));
            assertThat(entered.await(5, TimeUnit.SECONDS)).isTrue();
            AtomicReference<Thread> secondThread = new AtomicReference<>();
            Future<List<SerperScholarItem>> second = pool.submit(() -> {
                secondThread.set(Thread.currentThread());
                return scholarSearchService.search("Чеканин", 0);
            });
            awaitParked(secondThread);
            release.countDown();

            assertThatThrownBy(() -> first.get(5, TimeUnit.SECONDS))
                    .hasCauseInstanceOf(ScholarUnavailableException.class);
            assertThatThrownBy(() -> second.get(5, TimeUnit.SECONDS))
                    .hasCauseInstanceOf(ScholarUnavailableException.class);
            then(serperScholarClient).should(times(1)).search("чеканин", 0);
            assertThat(cacheRepository.count()).isZero();
        } finally {
            pool.shutdownNow();
        }
    }

    private void awaitParked(AtomicReference<Thread> thread) {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
        while (System.nanoTime() < deadline) {
            Thread candidate = thread.get();
            if (candidate != null && candidate.getState() == Thread.State.WAITING) {
                return;
            }
            Thread.onSpinWait();
        }

        throw new AssertionError("Второй поток не дошёл до ожидания результата первого");
    }

    @Test
    void searchAfterFailureCallsSerperAgain() {
        given(serperScholarClient.search("чеканин", 0))
                .willThrow(new ScholarUnavailableException("Google Scholar не отвечает."))
                .willReturn(List.of(SerperScholarItem.builder().title("Работа").build()));

        assertThatThrownBy(() -> scholarSearchService.search("Чеканин", 0))
                .isInstanceOf(ScholarUnavailableException.class);

        assertThat(scholarSearchService.search("Чеканин", 0)).hasSize(1);
        then(serperScholarClient).should(times(2)).search("чеканин", 0);
    }

    @Test
    void controlCharactersInQueryAreRejectedWithoutCallingService() {
        assertThatThrownBy(() -> scholarSearchService.search("a\u0000b", 0))
                .isInstanceOf(InvalidRequestException.class);

        then(serperScholarClient).should(never()).search(anyString(), anyInt());
    }

    @Test
    void rejectedByLimiterSearchDoesNotCallSerperNorCache() {
        willThrow(new TooManyRequestsException("Слишком много поисков.", 30))
                .given(callLimiter).acquire();

        assertThatThrownBy(() -> scholarSearchService.search("Чеканин", 0))
                .isInstanceOf(TooManyRequestsException.class);

        then(serperScholarClient).should(never()).search(anyString(), anyInt());
        assertThat(cacheRepository.count()).isZero();
    }

    @Test
    void cacheHitDoesNotSpendLimiter() {
        scholarSearchService.search("Чеканин", 0);
        scholarSearchService.search("Чеканин", 0);

        then(callLimiter).should(times(1)).acquire();
    }
}
