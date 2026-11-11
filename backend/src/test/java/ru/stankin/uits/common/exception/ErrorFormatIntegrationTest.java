package ru.stankin.uits.common.exception;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import ru.stankin.uits.AbstractIntegrationTest;
import ru.stankin.uits.TestRole;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class ErrorFormatIntegrationTest extends AbstractIntegrationTest {

    private HttpHeaders moderatorHeaders() {
        createUser("moder", TestRole.MODERATOR);
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(login("moder"));

        return headers;
    }

    private HttpHeaders moderatorJsonHeaders() {
        HttpHeaders headers = moderatorHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        return headers;
    }

    @Test
    void unknownApiPathReturnsRussianProblemJson() {
        ResponseEntity<String> response = restTemplate.getForEntity("/api/public/nothing", String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getHeaders().getContentType().toString()).startsWith("application/problem+json");
        assertThat(response.getBody())
                .contains("\"detail\":\"Ресурс не найден.\"")
                .contains("\"timestamp\"")
                .doesNotContain("No static resource");
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "/api/files",
            "/api/teachers/1/schedule/import",
            "/api/teachers/1/exams/import",
            "/api/gradesheets/import"
    })
    void uploadWithoutBodyReturns400(String path) {
        ResponseEntity<String> response = restTemplate.exchange(
                path, HttpMethod.POST, new HttpEntity<>(moderatorHeaders()), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody())
                .contains("Запрос должен быть multipart/form-data и содержать файл.")
                .contains("\"instance\":\"" + path + "\"");
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "/api/files",
            "/api/teachers/1/schedule/import",
            "/api/teachers/1/exams/import",
            "/api/gradesheets/import"
    })
    void uploadWithJsonBodyReturns400(String path) {
        ResponseEntity<String> response = restTemplate.exchange(
                path, HttpMethod.POST, new HttpEntity<>("{}", moderatorJsonHeaders()), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).contains("Запрос должен быть multipart/form-data и содержать файл.");
    }

    @Test
    void nulCharacterOnCreateReturns400() {
        ResponseEntity<String> response = restTemplate.exchange(
                "/api/subjects",
                HttpMethod.POST,
                new HttpEntity<>(Map.of("name", "дисциплина\u0000нуль", "description", "d"), moderatorJsonHeaders()),
                String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).contains("Текст содержит недопустимые символы.");
    }

    @Test
    void nulCharacterOnUpdateReturns400() {
        HttpHeaders headers = moderatorJsonHeaders();
        ResponseEntity<Map> created = restTemplate.exchange(
                "/api/subjects",
                HttpMethod.POST,
                new HttpEntity<>(Map.of("name", "Обычная дисциплина", "description", "d"), headers),
                Map.class);
        Object id = created.getBody().get("id");

        ResponseEntity<String> response = restTemplate.exchange(
                "/api/subjects/" + id,
                HttpMethod.PUT,
                new HttpEntity<>(Map.of("name", "Обычная дисциплина", "description", "a\u0000b"), headers),
                String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).contains("Текст содержит недопустимые символы.");
    }

    @Test
    void nulCharacterInTagReturns400() {
        ResponseEntity<String> response = restTemplate.exchange(
                "/api/tags",
                HttpMethod.POST,
                new HttpEntity<>(Map.of("name", "тег\u0000нуль"), moderatorJsonHeaders()),
                String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void tooLongRequestLineReturnsProblemJsonNotTomcatPage() {
        ResponseEntity<String> response = restTemplate.getForEntity(
                "/api/public/news?x={x}", String.class, "a".repeat(9000));

        assertThat(response.getStatusCode().is4xxClientError()).isTrue();
        assertThat(response.getHeaders().getContentType().toString()).startsWith("application/problem+json");
        assertThat(response.getBody())
                .contains("\"status\":" + response.getStatusCode().value())
                .contains("\"detail\"")
                .doesNotContain("Tomcat")
                .doesNotContain("<html");
    }
}
