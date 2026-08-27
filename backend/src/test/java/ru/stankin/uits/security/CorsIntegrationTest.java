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
import ru.stankin.uits.AbstractIntegrationTest;

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
