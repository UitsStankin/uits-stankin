package ru.stankin.uits.module.publications.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import ru.stankin.uits.common.exception.InvalidRequestException;
import ru.stankin.uits.module.publications.client.SerperScholarClient;
import ru.stankin.uits.module.publications.client.SerperScholarItem;
import ru.stankin.uits.module.publications.entity.ScholarSearchCache;
import ru.stankin.uits.module.publications.repository.ScholarSearchCacheRepository;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

@Service
public class ScholarSearchService {

    private static final Logger log = LoggerFactory.getLogger(ScholarSearchService.class);

    private static final int MAX_QUERY_LENGTH = 200;
    private static final int MAX_PAGE = 2;
    private static final Pattern WHITESPACE = Pattern.compile("\\s+");

    private final SerperScholarClient serperScholarClient;
    private final ScholarSearchCacheRepository cacheRepository;
    private final ScholarCallLimiter callLimiter;
    private final Duration cacheTtl;
    private final Duration emptyCacheTtl;
    private final Map<SearchKey, CompletableFuture<List<SerperScholarItem>>> inFlight = new ConcurrentHashMap<>();

    public ScholarSearchService(SerperScholarClient serperScholarClient,
                                ScholarSearchCacheRepository cacheRepository,
                                ScholarCallLimiter callLimiter,
                                @Value("${application.serper.cache-ttl}") Duration cacheTtl,
                                @Value("${application.serper.empty-cache-ttl}") Duration emptyCacheTtl) {
        this.serperScholarClient = serperScholarClient;
        this.cacheRepository = cacheRepository;
        this.callLimiter = callLimiter;
        this.cacheTtl = cacheTtl;
        this.emptyCacheTtl = emptyCacheTtl;
    }

    public List<SerperScholarItem> search(String rawQuery, int page) {
        String query = normalize(rawQuery);

        if (query.isEmpty()) {
            throw new InvalidRequestException("Запрос для поиска обязателен");
        }
        if (query.length() > MAX_QUERY_LENGTH) {
            throw new InvalidRequestException("Запрос не длиннее " + MAX_QUERY_LENGTH + " символов");
        }
        if (query.chars().anyMatch(Character::isISOControl)) {
            throw new InvalidRequestException("Запрос содержит недопустимые символы");
        }
        if (page < 0 || page > MAX_PAGE) {
            throw new InvalidRequestException("Доступны страницы с 0 по " + MAX_PAGE);
        }

        SearchKey key = new SearchKey(query, page);
        Optional<List<SerperScholarItem>> cached = findFresh(cacheRepository.findByQueryAndPage(query, page));

        return cached.orElseGet(() -> loadOnce(key));
    }

    private List<SerperScholarItem> loadOnce(SearchKey key) {
        CompletableFuture<List<SerperScholarItem>> own = new CompletableFuture<>();
        CompletableFuture<List<SerperScholarItem>> running = inFlight.putIfAbsent(key, own);

        if (running != null) {
            return awaitResult(running);
        }

        try {
            Optional<ScholarSearchCache> row = cacheRepository.findByQueryAndPage(key.query(), key.page());
            List<SerperScholarItem> items = findFresh(row)
                    .orElseGet(() -> fetchAndStore(key, row.orElse(null)));

            own.complete(items);

            return items;
        } catch (RuntimeException e) {
            own.completeExceptionally(e);
            throw e;
        } finally {
            inFlight.remove(key, own);
        }
    }

    private List<SerperScholarItem> awaitResult(CompletableFuture<List<SerperScholarItem>> running) {
        try {
            return running.join();
        } catch (CompletionException e) {
            if (e.getCause() instanceof RuntimeException cause) {
                throw cause;
            }

            throw e;
        }
    }

    private List<SerperScholarItem> fetchAndStore(SearchKey key, ScholarSearchCache existing) {
        callLimiter.acquire();
        List<SerperScholarItem> items = serperScholarClient.search(key.query(), key.page());
        store(existing, key, items);

        return items;
    }

    private String normalize(String rawQuery) {
        if (rawQuery == null) {
            return "";
        }

        return WHITESPACE.matcher(rawQuery.trim()).replaceAll(" ").toLowerCase(Locale.ROOT);
    }

    private Optional<List<SerperScholarItem>> findFresh(Optional<ScholarSearchCache> row) {
        return row.filter(this::isFresh).map(ScholarSearchCache::getResponse);
    }

    private boolean isFresh(ScholarSearchCache row) {
        Duration ttl = row.getResponse().isEmpty() ? emptyCacheTtl : cacheTtl;

        return row.getFetchedAt().isAfter(OffsetDateTime.now().minus(ttl));
    }

    private void store(ScholarSearchCache existing, SearchKey key, List<SerperScholarItem> items) {
        ScholarSearchCache row = existing != null
                ? existing
                : ScholarSearchCache.builder().query(key.query()).page(key.page()).build();
        row.setResponse(items);
        row.setFetchedAt(OffsetDateTime.now());

        try {
            cacheRepository.save(row);
        } catch (DataIntegrityViolationException e) {
            log.debug("Строка кэша для «{}» страницы {} уже сохранена другим запросом", key.query(), key.page());
        }
    }

    private record SearchKey(String query, int page) {
    }
}
