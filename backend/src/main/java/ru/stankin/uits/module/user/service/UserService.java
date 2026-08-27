package ru.stankin.uits.module.user.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.stankin.uits.common.exception.InvalidFileException;
import ru.stankin.uits.common.exception.InvalidOldPasswordException;
import ru.stankin.uits.common.exception.NotFoundException;
import ru.stankin.uits.common.storage.FileCleanup;
import ru.stankin.uits.common.storage.FileStorage;
import ru.stankin.uits.module.user.dto.UserResponseDto;
import ru.stankin.uits.module.user.dto.UserUpdateRequestDto;
import ru.stankin.uits.module.user.entity.User;
import ru.stankin.uits.module.user.mapper.UserMapper;
import ru.stankin.uits.module.user.repository.UserRepository;

import java.time.OffsetDateTime;

@Service
@RequiredArgsConstructor
public class UserService {

    private static final String AVATAR_CATEGORY = "avatars";

    private final UserMapper userMapper;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final FileStorage fileStorage;
    private final FileCleanup fileCleanup;

    @Transactional(readOnly = true)
    public UserResponseDto getUserProfile(User user) {
        return userMapper.toDto(user);
    }

    @Transactional
    public UserResponseDto updateProfile(Long userId, UserUpdateRequestDto request) {
        User managedUser = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Пользователь не найден"));

        validateAvatar(request.getAvatar());
        String oldAvatarKey = managedUser.getAvatar();
        userMapper.updateEntity(managedUser, request);

        if (oldAvatarKey != null && !oldAvatarKey.equals(managedUser.getAvatar())) {
            fileCleanup.deleteAfterCommit(oldAvatarKey);
        }

        return userMapper.toDto(managedUser);
    }

    @Transactional
    public void changePassword(User user, String oldPassword, String newPassword) {
        User managedUser = userRepository.findById(user.getId())
                .orElseThrow(() -> new NotFoundException("Пользователь не найден"));

        if (!passwordEncoder.matches(oldPassword, managedUser.getPassword())) {
            throw new InvalidOldPasswordException("Старый пароль введен неверно");
        }

        managedUser.setPassword(passwordEncoder.encode(newPassword));
    }

    @Transactional
    public void updateLastLogin(Long userId) {
        userRepository.updateLastLogin(userId, OffsetDateTime.now());
    }

    private void validateAvatar(String key) {
        if (key == null) {
            return;
        }

        if (!fileStorage.existsInCategory(key, AVATAR_CATEGORY)) {
            throw new InvalidFileException("Файл аватара не найден: " + key);
        }
    }
}
