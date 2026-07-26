package ru.stankin.uits.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.http.*;
import ru.stankin.uits.AbstractIntegrationTest;

import javax.crypto.SecretKey;

import java.util.Date;

import static org.assertj.core.api.Assertions.assertThat;

public class JwtSecurityIntegrationTest extends AbstractIntegrationTest {
    @Autowired
    private TestRestTemplate restTemplate;

    private static final String OTHER_SECRET = "516F746865725365637265744B6579466F7254657374734F6E6C793132333435";

    @Test
    @DisplayName("Должен вернуть 401, если строка не похожа на токен (токен битый)")
    void shouldReturn401_WhenTokenIsMalformed() {
        ResponseEntity<String> response = getProfile("abc.def");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(response.getHeaders().getContentType().toString())
                .startsWith(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        assertThat(response.getBody()).contains("Требуется аутентификация");
    }

    @Test
    @DisplayName("Должен вернуть 401, если срок жизни истек")
    void shouldReturn401_WhenTokenIsExpired() {
        SecretKey key = Keys.hmacShaKeyFor(Decoders.BASE64.decode(JWT_SECRET));
        String expiredToken = Jwts.builder()
                .subject("prof_ivanov")
                .issuedAt(new Date(System.currentTimeMillis() - 172_800_000))
                .expiration(new Date(System.currentTimeMillis() - 86_400_000))
                .signWith(key)
                .compact();

        ResponseEntity<String> response = getProfile(expiredToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @DisplayName("Должен вернуть 401, если токен подписан чужим ключом")
    void shouldReturn401_WhenTokenSignatureIsInvalid() {
        SecretKey key = Keys.hmacShaKeyFor(Decoders.BASE64.decode(OTHER_SECRET));
        String forgedToken = Jwts.builder()
                .subject("prof_ivanov")
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + 86_400_000))
                .signWith(key)
                .compact();

        ResponseEntity<String> response = getProfile(forgedToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @DisplayName("Должен вернуть 401, если заголовок Authorization отсутствует")
    void shouldReturn401_WhenNoTokenProvided() {
        ResponseEntity<String> response = restTemplate.getForEntity(
                "/api/users/profile",
                String.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(response.getHeaders().getContentType().toString())
                .startsWith(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        assertThat(response.getBody()).contains("Требуется аутентификация");
    }

    private ResponseEntity<String> getProfile(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + token);

        HttpEntity<Void> request = new HttpEntity<>(null, headers);

        return restTemplate.exchange(
                "/api/users/profile",
                HttpMethod.GET,
                request,
                String.class
        );
    }
}
