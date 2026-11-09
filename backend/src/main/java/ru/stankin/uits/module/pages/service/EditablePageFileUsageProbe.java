package ru.stankin.uits.module.pages.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import ru.stankin.uits.common.storage.FileUsageProbe;
import ru.stankin.uits.module.pages.repository.EditablePageRepository;

@Component
@RequiredArgsConstructor
public class EditablePageFileUsageProbe implements FileUsageProbe {

    private final EditablePageRepository editablePageRepository;

    @Override
    public boolean uses(String key) {
        return editablePageRepository.existsByTextContaining(key);
    }
}
