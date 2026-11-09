package ru.stankin.uits.module.publications.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import ru.stankin.uits.common.storage.FileUsageProbe;
import ru.stankin.uits.module.publications.repository.PublicationRepository;

@Component
@RequiredArgsConstructor
public class PublicationFileUsageProbe implements FileUsageProbe {

    private final PublicationRepository publicationRepository;

    @Override
    public boolean uses(String key) {
        return publicationRepository.existsByFile(key);
    }
}
