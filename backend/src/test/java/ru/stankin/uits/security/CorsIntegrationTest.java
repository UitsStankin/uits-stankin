package ru.stankin.uits.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import ru.stankin.uits.AbstractIntegrationTest;
import ru.stankin.uits.TestRole;
import ru.stankin.uits.module.news.dto.NewsRequestDto;

import static org.assertj.core.api.Assertions.assertThat;

public class CorsIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    private static final String ALLOWED_ORIGIN = "http://localhost:5173";
    private static final String FOREIGN_ORIGIN = "http://evil.example";

    @Test
    @DisplayName("Preflight с origin из белого списка разрешён вместе с режимом credentials")
    void preflight_WhenOriginIsAllowed_AllowsOriginWithCredentials() {
        ResponseEntity<String> response = preflight(ALLOWED_ORIGIN);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getHeaders().getAccessControlAllowOrigin()).isEqualTo(ALLOWED_ORIGIN);

        assertThat(response.getHeaders().getFirst(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS))
                .isEqualTo("true");
    }

    @Test
    @DisplayName("Preflight с чужого origin отклоняется")
    void preflight_WhenOriginIsNotAllowed_Returns403() {
        ResponseEntity<String> response = preflight(FOREIGN_ORIGIN);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    @DisplayName("Location и Retry-After открыты браузеру: без Expose-Headers фронт их не прочитает")
    void response_ExposesHeadersFrontendReads() {
        createUser("cors_admin", TestRole.ADMIN);
        String token = login("cors_admin");

        NewsRequestDto request = new NewsRequestDto();
        request.setTitle("Новость для проверки CORS");
        request.setShortDescription("Короткое описание");
        request.setPostType("news");
        request.setContent("<p>Текст</p>");
        request.setDisplay(true);

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set(HttpHeaders.ORIGIN, ALLOWED_ORIGIN);

        ResponseEntity<String> response = restTemplate.exchange(
                "/api/news", HttpMethod.POST, new HttpEntity<>(request, headers), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getHeaders().getFirst(HttpHeaders.ACCESS_CONTROL_EXPOSE_HEADERS))
                .isNotNull()
                .contains(HttpHeaders.LOCATION)
                .contains(HttpHeaders.RETRY_AFTER);
    }

    @Test
    @DisplayName("Location — путь, а не абсолютный адрес: за прокси абсолютный увёл бы на внутренний хост")
    void createdResource_LocationIsRelativePath() {
        createUser("cors_author", TestRole.ADMIN);
        String token = login("cors_author");

        NewsRequestDto request = new NewsRequestDto();
        request.setTitle("Новость для проверки Location");
        request.setShortDescription("Короткое описание");
        request.setPostType("news");
        request.setContent("<p>Текст</p>");
        request.setDisplay(true);

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);

        ResponseEntity<String> response = restTemplate.exchange(
                "/api/news", HttpMethod.POST, new HttpEntity<>(request, headers), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getHeaders().getLocation())
                .isNotNull()
                .satisfies(location -> {
                    assertThat(location.isAbsolute()).isFalse();
                    assertThat(location.toString()).startsWith("/api/news/");
                });
    }

    private ResponseEntity<String> preflight(String origin) {
        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.ORIGIN, origin);
        headers.set(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, HttpMethod.GET.name());

        HttpEntity<Void> request = new HttpEntity<>(null, headers);

        return restTemplate.exchange(
                "/api/public/news",
                HttpMethod.OPTIONS,
                request,
                String.class
        );
    }
}
