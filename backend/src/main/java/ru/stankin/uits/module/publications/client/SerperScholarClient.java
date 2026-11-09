package ru.stankin.uits.module.publications.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import ru.stankin.uits.common.exception.ScholarUnavailableException;

import java.util.List;

@Component
public class SerperScholarClient {

    private static final Logger log = LoggerFactory.getLogger(SerperScholarClient.class);

    private static final String SEARCH_URI = "/scholar";
    private static final String LANGUAGE = "ru";

    private final RestClient serperRestClient;
    private final String apiKey;

    public SerperScholarClient(RestClient serperRestClient,
                               @Value("${application.serper.key}") String apiKey) {
        this.serperRestClient = serperRestClient;
        this.apiKey = apiKey;
    }

    public List<SerperScholarItem> search(String query, int page) {
        if (apiKey.isBlank()) {
            throw new ScholarUnavailableException("Поиск по Google Scholar не настроен.");
        }

        SerperScholarResponse response;
        try {
            response = serperRestClient.post()
                    .uri(SEARCH_URI)
                    .header("X-API-KEY", apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(new SerperScholarRequest(query, LANGUAGE, page + 1))
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (request, httpResponse) -> {
                        log.error("Serper ответил {} на поиск публикаций", httpResponse.getStatusCode().value());
                        throw new ScholarUnavailableException("Поиск по Google Scholar временно недоступен.");
                    })
                    .body(SerperScholarResponse.class);
        } catch (ResourceAccessException e) {
            throw new ScholarUnavailableException("Google Scholar не отвечает.", e);
        }

        return response == null || response.getOrganic() == null ? List.of() : response.getOrganic();
    }
}
