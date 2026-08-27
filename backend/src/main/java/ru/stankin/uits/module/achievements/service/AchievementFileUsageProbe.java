package ru.stankin.uits.module.achievements.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import ru.stankin.uits.common.storage.FileUsageProbe;
import ru.stankin.uits.module.achievements.repository.AchievementRepository;

@Component
@RequiredArgsConstructor
public class AchievementFileUsageProbe implements FileUsageProbe {

    private final AchievementRepository achievementRepository;

    @Override
    public boolean uses(String key) {
        return achievementRepository.existsByPreviewImage(key);
    }
}
