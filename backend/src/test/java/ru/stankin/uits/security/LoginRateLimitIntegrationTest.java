package ru.stankin.uits.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import ru.stankin.uits.AbstractIntegrationTest;
import ru.stankin.uits.TestRole;
import ru.stankin.uits.module.auth.controller.AuthController;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "application.security.login-rate-limit.attempts=3"
)
class LoginRateLimitIntegrationTest extends AbstractIntegrationTest {

    private static final String USERNAME = "brute_force_target";
    private static final int ATTEMPTS = 3;

    @Test
    @DisplayName("Лимит попыток входа: сверх нормы — 429 с Retry-After, и верный пароль тоже не проходит")
    void login_WhenAttemptsExceedLimit_Returns429ForEveryFurtherAttempt() {
        createUser(USERNAME, TestRole.USER);

        for (int attempt = 0; attempt < ATTEMPTS; attempt++) {
            assertThat(attempt("wrong_password").getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        }

        ResponseEntity<ProblemDetail> blocked = attempt("wrong_password");

        assertThat(blocked.getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
        assertThat(blocked.getHeaders().getFirst(HttpHeaders.RETRY_AFTER)).isNotNull();
        assertThat(blocked.getBody()).isNotNull();
        assertThat(blocked.getBody().getDetail()).isEqualTo("Слишком много попыток входа. Повторите позже.");

        assertThat(attempt(TEST_PASSWORD).getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
    }

    private ResponseEntity<ProblemDetail> attempt(String password) {
        return restTemplate.postForEntity(
                "/api/users/auth/login",
                new AuthController.LoginRequest(USERNAME, password),
                ProblemDetail.class
        );
    }
}
