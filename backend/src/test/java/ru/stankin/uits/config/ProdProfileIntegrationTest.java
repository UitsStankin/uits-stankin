package ru.stankin.uits.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;
import ru.stankin.uits.AbstractIntegrationTest;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Фиксирует поведение прод-профиля: что открыто наружу, а чего в проде быть не должно.
 *
 * inheritProfiles = false заменяет унаследованный от AbstractIntegrationTest профиль test,
 * а не складывается с ним: контекст с профилями test + prod одновременно не соответствует
 * ни одному реальному запуску, и проверять в нём нечего.
 */
@ActiveProfiles(value = "prod", inheritProfiles = false)
public class ProdProfileIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    @DisplayName("Health отвечает без токена — деплою есть чем проверить, что приложение живо")
    void health_WhenNoToken_Returns200() {
        ResponseEntity<String> response = restTemplate.getForEntity("/actuator/health", String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).contains("\"status\":\"UP\"");
    }

    @Test
    @DisplayName("Health отдаёт только статус: show-details = never")
    void health_WhenNoToken_HidesComponentDetails() {
        ResponseEntity<String> response = restTemplate.getForEntity("/actuator/health", String.class);

        // Статус проверяется и здесь: без него тест проходит и на 401,
        // где в теле ProblemDetail слова "components" тоже нет
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).doesNotContain("components");
    }

    @Test
    @DisplayName("Readiness отвечает: probes включены, деплою есть чем дождаться готовности")
    void readiness_WhenNoToken_Returns200() {
        ResponseEntity<String> response =
                restTemplate.getForEntity("/actuator/health/readiness", String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).contains("\"status\":\"UP\"");
    }

    @Test
    @DisplayName("Открыт только health: корень actuator требует аутентификации")
    void actuatorRoot_WhenNoToken_Returns401() {
        ResponseEntity<String> response = restTemplate.getForEntity("/actuator", String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @DisplayName("Схема OpenAPI в проде не отдаётся")
    void apiDocs_InProdProfile_Returns404() {
        ResponseEntity<String> response = restTemplate.getForEntity("/v3/api-docs", String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    @DisplayName("Страница Swagger UI в проде не отдаётся")
    void swaggerUi_InProdProfile_Returns404() {
        ResponseEntity<String> response =
                restTemplate.getForEntity("/swagger-ui/index.html", String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }
}
