package ru.stankin.uits.module.publications;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import ru.stankin.uits.AbstractIntegrationTest;
import ru.stankin.uits.common.exception.InvalidRequestException;
import ru.stankin.uits.module.publications.client.SerperScholarClient;
import ru.stankin.uits.module.publications.client.SerperScholarItem;
import ru.stankin.uits.module.publications.repository.ScholarSearchCacheRepository;
import ru.stankin.uits.module.publications.service.ScholarSearchService;

import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;

class ScholarSearchServiceIntegrationTest extends AbstractIntegrationTest {

    @MockitoBean
    private SerperScholarClient serperScholarClient;

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
}
