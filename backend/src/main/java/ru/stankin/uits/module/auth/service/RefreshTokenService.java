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
    private final long maxSessionMillis;

    public RefreshTokenService(
            RefreshTokenRepository refreshTokenRepository,
            @Value("${application.security.refresh.expiration}") long expirationMillis,
            @Value("${application.security.refresh.grace-period}") long gracePeriodMillis,
            @Value("${application.security.refresh.max-session}") long maxSessionMillis
    ) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.expirationMillis = expirationMillis;
        this.gracePeriodMillis = gracePeriodMillis;
        this.maxSessionMillis = maxSessionMillis;
    }

    public record Rotation(User user, String refreshToken) {}

    @Transactional
    public String issue(User user) {
        return issue(user, UUID.randomUUID(), null, OffsetDateTime.now());
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

        if (isFamilyPastMaxSession(token.getFamilyCreatedAt(), now)) {
            refreshTokenRepository.revokeFamily(token.getFamilyId(), now);
            throw new InvalidRefreshTokenException("Достигнут предельный срок сессии");
        }

        if (token.getUsedAt() != null && isOutsideGracePeriod(token.getUsedAt(), now)) {
            log.warn("Повторное использование refresh-токена: семейство {} отозвано", token.getFamilyId());
            refreshTokenRepository.revokeFamily(token.getFamilyId(), now);
            throw new InvalidRefreshTokenException("Повторное использование токена сессии");
        }

        // Grace-окно позволяет получить от одного родителя два токена. Дальше живёт
        // ровно одна ветка: если брат предъявленного токена уже ротирован — вторую
        // ветку двигает украденная cookie, семейство закрывается целиком.
        if (token.getParentId() != null
                && refreshTokenRepository.existsByParentIdAndUsedAtIsNotNullAndIdNot(token.getParentId(), token.getId())) {
            log.warn("Ротация второй ветки refresh-токена: семейство {} отозвано", token.getFamilyId());
            refreshTokenRepository.revokeFamily(token.getFamilyId(), now);
            throw new InvalidRefreshTokenException("Повторное использование токена сессии");
        }

        if (token.getUsedAt() == null) {
            token.setUsedAt(now);
        }

        return new Rotation(user, issue(user, token.getFamilyId(), token.getId(), token.getFamilyCreatedAt()));
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

    private String issue(User user, UUID familyId, Long parentId, OffsetDateTime familyCreatedAt) {
        byte[] bytes = new byte[TOKEN_BYTES];
        secureRandom.nextBytes(bytes);

        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        OffsetDateTime now = OffsetDateTime.now();

        refreshTokenRepository.save(RefreshToken.builder()
                .tokenHash(hash(rawToken))
                .user(user)
                .familyId(familyId)
                .parentId(parentId)
                .familyCreatedAt(familyCreatedAt)
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

    private boolean isFamilyPastMaxSession(OffsetDateTime familyCreatedAt, OffsetDateTime now) {
        return familyCreatedAt.plus(maxSessionMillis, ChronoUnit.MILLIS).isBefore(now);
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
