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
import java.util.Optional;
import java.util.regex.Pattern;

@Service
public class ScholarSearchService {

    private static final Logger log = LoggerFactory.getLogger(ScholarSearchService.class);

    private static final int MAX_QUERY_LENGTH = 200;
    private static final int MAX_PAGE = 2;
    private static final Pattern WHITESPACE = Pattern.compile("\\s+");

    private final SerperScholarClient serperScholarClient;
    private final ScholarSearchCacheRepository cacheRepository;
    private final Duration cacheTtl;

    public ScholarSearchService(SerperScholarClient serperScholarClient,
                                ScholarSearchCacheRepository cacheRepository,
                                @Value("${application.serper.cache-ttl}") Duration cacheTtl) {
        this.serperScholarClient = serperScholarClient;
        this.cacheRepository = cacheRepository;
        this.cacheTtl = cacheTtl;
    }

    public List<SerperScholarItem> search(String rawQuery, int page) {
        String query = normalize(rawQuery);

        if (query.isEmpty()) {
            throw new InvalidRequestException("Запрос для поиска обязателен");
        }
        if (query.length() > MAX_QUERY_LENGTH) {
            throw new InvalidRequestException("Запрос не длиннее " + MAX_QUERY_LENGTH + " символов");
        }
        if (page < 0 || page > MAX_PAGE) {
            throw new InvalidRequestException("Доступны страницы с 0 по " + MAX_PAGE);
        }

        Optional<ScholarSearchCache> cached = cacheRepository.findByQueryAndPage(query, page);
        if (cached.isPresent() && isFresh(cached.get())) {
            return cached.get().getResponse();
        }

        List<SerperScholarItem> items = serperScholarClient.search(query, page);
        store(cached.orElse(null), query, page, items);

        return items;
    }

    private String normalize(String rawQuery) {
        if (rawQuery == null) {
            return "";
        }

        return WHITESPACE.matcher(rawQuery.trim()).replaceAll(" ").toLowerCase(Locale.ROOT);
    }

    private boolean isFresh(ScholarSearchCache row) {
        return row.getFetchedAt().isAfter(OffsetDateTime.now().minus(cacheTtl));
    }

    private void store(ScholarSearchCache existing, String query, int page, List<SerperScholarItem> items) {
        ScholarSearchCache row = existing != null
                ? existing
                : ScholarSearchCache.builder().query(query).page(page).build();
        row.setResponse(items);
        row.setFetchedAt(OffsetDateTime.now());

        try {
            cacheRepository.save(row);
        } catch (DataIntegrityViolationException e) {
            log.debug("Строка кэша для «{}» страницы {} уже сохранена другим запросом", query, page);
        }
    }
}
