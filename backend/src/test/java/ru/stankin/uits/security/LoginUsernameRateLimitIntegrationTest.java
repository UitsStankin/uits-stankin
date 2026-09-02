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

/**
 * Ведро по учётной записи: лимит по IP в тестовом контексте огромный,
 * так что блокировать здесь обязано именно оно.
 */
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "application.security.login-rate-limit.username-attempts=3"
)
class LoginUsernameRateLimitIntegrationTest extends AbstractIntegrationTest {

    private static final int ATTEMPTS = 3;

    @Test
    @DisplayName("Перебор одной учётки: сверх нормы — 429 с Retry-After, другая учётка с того же IP проходит")
    void login_WhenSingleAccountExceedsLimit_Returns429ButOtherAccountFromSameIpPasses() {
        createUser("bruteforced_account", TestRole.USER);
        createUser("bystander_account", TestRole.USER);

        for (int attempt = 0; attempt < ATTEMPTS; attempt++) {
            assertThat(attempt("bruteforced_account").getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        }

        ResponseEntity<ProblemDetail> blocked = attempt("bruteforced_account");

        assertThat(blocked.getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
        assertThat(blocked.getHeaders().getFirst(HttpHeaders.RETRY_AFTER)).isNotNull();
        assertThat(blocked.getBody()).isNotNull();
        assertThat(blocked.getBody().getDetail()).isEqualTo("Слишком много попыток входа. Повторите позже.");

        assertThat(attempt("bystander_account").getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @DisplayName("Регистр и пробелы в логине не выдают перебору новое ведро")
    void login_WhenUsernameCaseAndSpacesDiffer_StillHitsTheSameBucket() {
        createUser("case_target", TestRole.USER);

        for (int attempt = 0; attempt < ATTEMPTS; attempt++) {
            assertThat(attempt("case_target").getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        }

        assertThat(attempt("  CASE_TARGET  ").getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
    }

    private ResponseEntity<ProblemDetail> attempt(String username) {
        return restTemplate.postForEntity(
                "/api/users/auth/login",
                new AuthController.LoginRequest(username, "wrong_password"),
                ProblemDetail.class
        );
    }
}
