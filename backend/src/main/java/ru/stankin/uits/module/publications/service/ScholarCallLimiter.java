package ru.stankin.uits.module.publications.service;

import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import ru.stankin.uits.common.exception.TooManyRequestsException;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

@Component
public class ScholarCallLimiter {

    private static final Logger log = LoggerFactory.getLogger(ScholarCallLimiter.class);

    private final Bucket bucket;

    public ScholarCallLimiter(
            @Value("${application.serper.rate-limit.attempts}") long attempts,
            @Value("${application.serper.rate-limit.period}") Duration period) {
        this.bucket = Bucket.builder()
                .addLimit(limit -> limit.capacity(attempts).refillGreedy(attempts, period))
                .build();
    }

    public void acquire() {
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);

        if (!probe.isConsumed()) {
            long retryAfterSeconds = Math.max(1, TimeUnit.NANOSECONDS.toSeconds(probe.getNanosToWaitForRefill()));
            log.warn("Превышен лимит исходящих вызовов к Serper, повтор через {} с", retryAfterSeconds);

            throw new TooManyRequestsException(
                    "Слишком много поисков в Google Scholar. Повторите через " + retryAfterSeconds + " с.",
                    retryAfterSeconds);
        }
    }
}
