package ru.stankin.uits.module.publications;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import ru.stankin.uits.AbstractIntegrationTest;
import ru.stankin.uits.TestRole;
import ru.stankin.uits.common.exception.ScholarUnavailableException;
import ru.stankin.uits.module.publications.client.SerperScholarClient;
import ru.stankin.uits.module.publications.client.SerperScholarItem;
import ru.stankin.uits.module.publications.dto.ScholarSearchItemDto;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.never;

class ScholarSearchControllerIntegrationTest extends AbstractIntegrationTest {

    @MockitoBean
    private SerperScholarClient serperScholarClient;

    @BeforeEach
    void stubClient() {
        given(serperScholarClient.search(anyString(), anyInt())).willReturn(List.of(
                SerperScholarItem.builder()
                        .id("abc123")
                        .title("Оптимизация решения задачи ортогональной упаковки объектов")
                        .link("https://cyberleninka.ru/article/n/optimizatsiya")
                        .publicationInfo("ВА Чеканин, АВ Чеканин - Прикладная информатика, 2012 - cyberleninka.ru")
                        .year(2012)
                        .citedBy(12)
                        .build(),
                SerperScholarItem.builder()
                        .title("К вопросу о повышении плотности ортогональной упаковки")
                        .year(2018)
                        .build()));
    }

    private HttpHeaders auth(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);

        return headers;
    }

    private String moderatorToken() {
        createUser("moder", TestRole.MODERATOR);

        return login("moder");
    }

    private ResponseEntity<String> search(String path, String token) {
        return restTemplate.exchange(path, HttpMethod.GET, new HttpEntity<>(auth(token)),
                String.class);
    }

    @Test
    void moderatorGetsDraftCards() {
        ResponseEntity<List<ScholarSearchItemDto>> response = restTemplate.exchange(
                "/api/publications/scholar?q=Чеканин",
                HttpMethod.GET,
                new HttpEntity<>(auth(moderatorToken())),
                new ParameterizedTypeReference<>() {
                });

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(2);

        ScholarSearchItemDto first = response.getBody().getFirst();
        assertThat(first.getTitle()).isEqualTo("Оптимизация решения задачи ортогональной упаковки объектов");
        assertThat(first.getId()).isEqualTo("abc123");
        assertThat(first.getYear()).isEqualTo(2012);
        assertThat(response.getBody().getLast().getLink()).isNull();

        then(serperScholarClient).should().search("чеканин", 0);
    }

    @Test
    void pageIsPassedToTheSearch() {
        search("/api/publications/scholar?q=Чеканин&page=2", moderatorToken());

        then(serperScholarClient).should().search("чеканин", 2);
    }

    @Test
    void missingQueryGivesBadRequest() {
        ResponseEntity<String> response = search("/api/publications/scholar", moderatorToken());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        then(serperScholarClient).should(never()).search(anyString(), anyInt());
    }

    @Test
    void pageOutsideRangeGivesBadRequest() {
        ResponseEntity<String> response = search("/api/publications/scholar?q=Чеканин&page=3", moderatorToken());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        then(serperScholarClient).should(never()).search(anyString(), anyInt());
    }

    @Test
    void unavailableSearchGivesServiceUnavailable() {
        willThrow(new ScholarUnavailableException("Поиск по Google Scholar не настроен."))
                .given(serperScholarClient).search(anyString(), anyInt());

        ResponseEntity<String> response = search("/api/publications/scholar?q=Чеканин", moderatorToken());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
        assertThat(response.getBody()).contains("Поиск по Google Scholar не настроен.");
    }

    @Test
    void teacherIsForbidden() {
        createUser("teacher", TestRole.TEACHER);

        ResponseEntity<String> response = search("/api/publications/scholar?q=Чеканин", login("teacher"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        then(serperScholarClient).should(never()).search(anyString(), anyInt());
    }
}
