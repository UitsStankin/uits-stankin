package ru.stankin.uits.module.auth.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.stankin.uits.common.exception.InvalidRefreshTokenException;
import ru.stankin.uits.module.auth.entity.RefreshToken;
import ru.stankin.uits.module.auth.repository.RefreshTokenRepository;
import ru.stankin.uits.module.user.entity.User;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;

@Slf4j
@Service
public class RefreshTokenService {

    private static final int TOKEN_BYTES = 32;

    private final RefreshTokenRepository refreshTokenRepository;
    private final SecureRandom secureRandom = new SecureRandom();
    private final long expirationMillis;
    private final long gracePeriodMillis;

    public RefreshTokenService(
            RefreshTokenRepository refreshTokenRepository,
            @Value("${application.security.refresh.expiration}") long expirationMillis,
            @Value("${application.security.refresh.grace-period}") long gracePeriodMillis
    ) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.expirationMillis = expirationMillis;
        this.gracePeriodMillis = gracePeriodMillis;
    }

    public record Rotation(User user, String refreshToken) {}

    @Transactional
    public String issue(User user) {
        return issue(user, UUID.randomUUID());
    }

    @Transactional(noRollbackFor = InvalidRefreshTokenException.class)
    public Rotation rotate(String rawToken) {
        RefreshToken token = refreshTokenRepository.findByTokenHash(hash(rawToken))
                .orElseThrow(() -> new InvalidRefreshTokenException("Токен сессии неизвестен"));

        OffsetDateTime now = OffsetDateTime.now();

        if (token.getRevokedAt() != null || !token.getExpiresAt().isAfter(now)) {
            throw new InvalidRefreshTokenException("Сессия закрыта или истекла");
        }

        User user = token.getUser();

        if (!user.isActive()) {
            refreshTokenRepository.revokeFamily(token.getFamilyId(), now);
            throw new InvalidRefreshTokenException("Учётная запись недоступна");
        }

        if (isIssuedBeforeCredentialsChange(token, user)) {
            refreshTokenRepository.revokeFamily(token.getFamilyId(), now);
            throw new InvalidRefreshTokenException("Сессия открыта до смены пароля");
        }

        if (token.getUsedAt() != null && isOutsideGracePeriod(token.getUsedAt(), now)) {
            log.warn("Повторное использование refresh-токена: семейство {} отозвано", token.getFamilyId());
            refreshTokenRepository.revokeFamily(token.getFamilyId(), now);
            throw new InvalidRefreshTokenException("Повторное использование токена сессии");
        }

        if (token.getUsedAt() == null) {
            token.setUsedAt(now);
        }

        return new Rotation(user, issue(user, token.getFamilyId()));
    }

    @Transactional
    public void revokeSession(String rawToken) {
        refreshTokenRepository.findByTokenHash(hash(rawToken))
                .ifPresent(token -> refreshTokenRepository.revokeFamily(token.getFamilyId(), OffsetDateTime.now()));
    }

    @Transactional
    public int deleteExpired() {
        return refreshTokenRepository.deleteExpired(OffsetDateTime.now());
    }

    private String issue(User user, UUID familyId) {
        byte[] bytes = new byte[TOKEN_BYTES];
        secureRandom.nextBytes(bytes);

        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        OffsetDateTime now = OffsetDateTime.now();

        refreshTokenRepository.save(RefreshToken.builder()
                .tokenHash(hash(rawToken))
                .user(user)
                .familyId(familyId)
                .issuedAt(now)
                .expiresAt(now.plus(expirationMillis, ChronoUnit.MILLIS))
                .build());

        return rawToken;
    }

    private boolean isIssuedBeforeCredentialsChange(RefreshToken token, User user) {
        return user.getTokensNotBefore() != null && token.getIssuedAt().isBefore(user.getTokensNotBefore());
    }

    private boolean isOutsideGracePeriod(OffsetDateTime usedAt, OffsetDateTime now) {
        return usedAt.plus(gracePeriodMillis, ChronoUnit.MILLIS).isBefore(now);
    }

    private String hash(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(rawToken.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("Алгоритм SHA-256 недоступен", e);
        }
    }
}
