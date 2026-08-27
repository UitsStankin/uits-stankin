package ru.stankin.uits.module.user.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import ru.stankin.uits.common.storage.FileUsageProbe;
import ru.stankin.uits.module.user.repository.UserRepository;

@Component
@RequiredArgsConstructor
public class UserFileUsageProbe implements FileUsageProbe {

    private final UserRepository userRepository;

    @Override
    public boolean uses(String key) {
        return userRepository.existsByAvatar(key);
    }
}
