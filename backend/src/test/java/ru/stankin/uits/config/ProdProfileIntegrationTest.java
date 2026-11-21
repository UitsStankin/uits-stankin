package ru.stankin.uits.config;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.AppenderBase;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;
import ru.stankin.uits.AbstractIntegrationTest;
import ru.stankin.uits.common.RequestIdFilter;

import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Фиксирует поведение прод-профиля: что открыто наружу, а чего в проде быть не должно.
 *
 * inheritProfiles = false заменяет унаследованный от AbstractIntegrationTest профиль test,
 * а не складывается с ним: контекст с профилями test + prod одновременно не соответствует
 * ни одному реальному запуску, и проверять в нём нечего.
 */
@ActiveProfiles(value = "prod", inheritProfiles = false)
class ProdProfileIntegrationTest extends AbstractIntegrationTest {

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

    @ParameterizedTest
    @CsvSource({"/api/public/news, 200", "/api/events, 401"})
    void apiRequestIdMatchesLog(String path, int status) throws InterruptedException {
        Logger logger = (Logger) LoggerFactory.getLogger(RequestIdFilter.class);
        var logEvents = new LinkedBlockingQueue<ILoggingEvent>();
        var appender = new AppenderBase<ILoggingEvent>() {
            @Override
            protected void append(ILoggingEvent event) {
                event.prepareForDeferredProcessing();
                logEvents.add(event);
            }
        };
        appender.start();
        logger.addAppender(appender);
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set(RequestIdFilter.HEADER_NAME, "supplied-by-client");
            ResponseEntity<String> response =
                    restTemplate.exchange(path, HttpMethod.GET, new HttpEntity<>(headers), String.class);

            assertThat(response.getStatusCode().value()).isEqualTo(status);
            String requestId = response.getHeaders().getFirst(RequestIdFilter.HEADER_NAME);
            assertThat(requestId).matches("[a-f0-9-]{36}");

            assertThat(logEvents.poll(3, TimeUnit.SECONDS)).isNotNull().satisfies(event -> {
                assertThat(event.getMDCPropertyMap()).containsEntry("requestId", requestId);
                assertThat(event.getKeyValuePairs()).anySatisfy(field -> {
                    assertThat(field.key).isEqualTo("status");
                    assertThat(field.value).isEqualTo(status);
                });
            });
        } finally {
            logger.detachAppender(appender);
            appender.stop();
        }
    }
}
