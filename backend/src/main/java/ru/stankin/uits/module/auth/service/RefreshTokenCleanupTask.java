package ru.stankin.uits.module.auth.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class RefreshTokenCleanupTask {

    private final RefreshTokenService refreshTokenService;

    @Scheduled(cron = "${application.security.refresh.cleanup-cron}")
    public void deleteExpiredTokens() {
        int deleted = refreshTokenService.deleteExpired();

        if (deleted > 0) {
            log.info("Удалено просроченных refresh-токенов: {}", deleted);
        }
    }
}
