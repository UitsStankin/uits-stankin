package ru.stankin.uits.module.news.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import ru.stankin.uits.common.storage.FileUsageProbe;
import ru.stankin.uits.module.news.repository.ConferenceRepository;
import ru.stankin.uits.module.news.repository.NewsRepository;

@Component
@RequiredArgsConstructor
public class NewsFileUsageProbe implements FileUsageProbe {

    private final NewsRepository newsRepository;
    private final ConferenceRepository conferenceRepository;

    @Override
    public boolean uses(String key) {
        return newsRepository.existsByPreviewImage(key)
                || conferenceRepository.existsByPreviewImage(key)
                || newsRepository.existsByContentContaining(key)
                || conferenceRepository.existsByContentContaining(key);
    }
}
