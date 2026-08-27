package ru.stankin.uits.module.auth.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
public class RefreshCookieFactory {

    public static final String COOKIE_NAME = "refreshToken";

    private static final String COOKIE_PATH = "/api/users/auth";
    private static final String SAME_SITE = "Lax";

    private final boolean secure;
    private final Duration maxAge;

    public RefreshCookieFactory(
            @Value("${application.security.refresh.cookie-secure}") boolean secure,
            @Value("${application.security.refresh.expiration}") long expirationMillis
    ) {
        this.secure = secure;
        this.maxAge = Duration.ofMillis(expirationMillis);
    }

    public ResponseCookie create(String rawToken) {
        return builder(rawToken).maxAge(maxAge).build();
    }

    public ResponseCookie clear() {
        return builder("").maxAge(Duration.ZERO).build();
    }

    private ResponseCookie.ResponseCookieBuilder builder(String value) {
        return ResponseCookie.from(COOKIE_NAME, value)
                .httpOnly(true)
                .secure(secure)
                .sameSite(SAME_SITE)
                .path(COOKIE_PATH);
    }
}
