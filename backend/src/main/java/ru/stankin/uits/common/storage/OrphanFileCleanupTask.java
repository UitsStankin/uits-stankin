package ru.stankin.uits.common.storage;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Set;

@Slf4j
@Component
public class OrphanFileCleanupTask {

    private final FileStorage fileStorage;
    private final List<FileUsageProbe> probes;
    private final Duration minAge;
    private final Set<String> sweptCategories;

    public OrphanFileCleanupTask(
            FileStorage fileStorage,
            List<FileUsageProbe> probes,
            @Value("${application.storage.orphan-cleanup.min-age}") long minAgeMillis,
            @Value("${application.storage.orphan-cleanup.categories}") Set<String> sweptCategories
    ) {
        this.fileStorage = fileStorage;
        this.probes = probes;
        this.minAge = Duration.ofMillis(minAgeMillis);
        this.sweptCategories = sweptCategories;
    }

    @Scheduled(cron = "${application.storage.orphan-cleanup.cron}")
    public void sweep() {
        Instant threshold = Instant.now().minus(minAge);
        int scanned = 0;
        int deleted = 0;

        for (StoredFile file : fileStorage.listFiles()) {
            scanned++;

            if (!sweptCategories.contains(categoryOf(file.key()))) {
                continue;
            }

            if (file.lastModified().isAfter(threshold)) {
                continue;
            }

            if (isUsed(file.key())) {
                continue;
            }

            try {
                fileStorage.delete(file.key());
                deleted++;
                log.info("Удалён файл-сирота: {}", file.key());
            } catch (RuntimeException e) {
                log.warn("Не удалось удалить файл-сироту {}: файл останется до следующего прохода",
                        file.key(), e);
            }
        }

        if (deleted > 0 || log.isDebugEnabled()) {
            log.info("Уборка сирот: просмотрено файлов {}, удалено {}", scanned, deleted);
        }
    }

    private String categoryOf(String key) {
        int separator = key.indexOf('/');
        return separator < 0 ? key : key.substring(0, separator);
    }

    private boolean isUsed(String key) {
        return probes.stream().anyMatch(probe -> probe.uses(key));
    }
}
