package ru.stankin.uits.module.publications;

import org.junit.jupiter.api.Test;
import ru.stankin.uits.common.exception.TooManyRequestsException;
import ru.stankin.uits.module.publications.service.ScholarCallLimiter;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ScholarCallLimiterTest {

    @Test
    void callsWithinLimitPass() {
        ScholarCallLimiter limiter = new ScholarCallLimiter(3, Duration.ofMinutes(1));

        assertThatCode(() -> {
            limiter.acquire();
            limiter.acquire();
            limiter.acquire();
        }).doesNotThrowAnyException();
    }

    @Test
    void callOverLimitIsRejectedWithRetryAfter() {
        ScholarCallLimiter limiter = new ScholarCallLimiter(2, Duration.ofMinutes(1));
        limiter.acquire();
        limiter.acquire();

        assertThatThrownBy(limiter::acquire)
                .isInstanceOfSatisfying(TooManyRequestsException.class, e -> {
                    assertThat(e.getRetryAfterSeconds()).isBetween(1L, 60L);
                    assertThat(e.getMessage()).contains("Повторите через " + e.getRetryAfterSeconds() + " с");
                });
    }
}
