package ru.stankin.uits.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import ru.stankin.uits.AbstractIntegrationTest;
import ru.stankin.uits.TestRole;
import ru.stankin.uits.module.auth.controller.AuthController;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "application.security.login-rate-limit.attempts=2"
)
class LoginRateLimitProxyHeaderIntegrationTest extends AbstractIntegrationTest {

    private static final String USERNAME = "spoofing_client";
    private static final int ATTEMPTS = 2;

    @Test
    @DisplayName("Подменённый X-Forwarded-For не выдаёт атакующему новое ведро")
    void login_WhenClientForgesForwardedForHeader_StillHitsTheSameBucket() {
        createUser(USERNAME, TestRole.USER);

        for (int attempt = 0; attempt < ATTEMPTS; attempt++) {
            assertThat(attemptFrom("10.0.0." + attempt).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        }

        assertThat(attemptFrom("10.0.0.100").getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
    }

    private ResponseEntity<ProblemDetail> attemptFrom(String forwardedFor) {
        HttpHeaders headers = new HttpHeaders();
        headers.add("X-Forwarded-For", forwardedFor);

        return restTemplate.exchange(
                "/api/users/auth/login",
                HttpMethod.POST,
                new HttpEntity<>(new AuthController.LoginRequest(USERNAME, "wrong_password"), headers),
                ProblemDetail.class
        );
    }
}
