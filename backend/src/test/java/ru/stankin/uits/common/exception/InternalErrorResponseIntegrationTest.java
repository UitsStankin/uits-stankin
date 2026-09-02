package ru.stankin.uits.common.exception;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import ru.stankin.uits.AbstractIntegrationTest;
import ru.stankin.uits.TestRole;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Ответ на необработанное исключение не раскрывает внутренности: клиент
 * получает ровно «Внутренняя ошибка сервера.», без сообщения исключения,
 * его класса и стектрейса ({@code GlobalExceptionHandler#handleUnexpected}).
 *
 * <p>Тестовая ручка объявлена внутри локальной {@code @TestConfiguration}
 * намеренно: {@code @Import} меняет ключ кэша контекста Spring, поэтому класс
 * поднимает отдельный контекст, а в общий контекст остальных интеграционных
 * тестов ручка не попадает — и сторож {@code EndpointAccessMatrixTest}
 * не требует для неё строку в матрице доступа.
 */
@Import(InternalErrorResponseIntegrationTest.FailingEndpointConfiguration.class)
public class InternalErrorResponseIntegrationTest extends AbstractIntegrationTest {

    private static final String SECRET_MARKER = "секретный-маркер-12345";

    @TestConfiguration
    static class FailingEndpointConfiguration {

        // Явный @Bean не нужен: вложенный @RestController Spring регистрирует
        // сам при разборе конфигурации, второй бин давал Ambiguous mapping
        @RestController
        static class FailingController {

            @GetMapping("/api/internal-error-probe")
            String fail() {
                throw new RuntimeException(SECRET_MARKER);
            }
        }
    }

    @Test
    void unexpectedException_Returns500WithProblemDetailWithoutInternals() {
        createUser("plain_user", TestRole.USER);
        String token = login("plain_user");
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);

        ResponseEntity<String> response = restTemplate.exchange("/api/internal-error-probe",
                HttpMethod.GET, new HttpEntity<>(headers), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getHeaders().getContentType())
                .as("ошибка отдаётся телом ProblemDetail по RFC 9457")
                .isNotNull()
                .satisfies(type -> assertThat(type.toString())
                        .startsWith(MediaType.APPLICATION_PROBLEM_JSON_VALUE));
        assertThat(response.getBody())
                .contains("Внутренняя ошибка сервера.")
                .doesNotContain(SECRET_MARKER)
                .doesNotContain("RuntimeException")
                .doesNotContain("ru.stankin");
    }
}
