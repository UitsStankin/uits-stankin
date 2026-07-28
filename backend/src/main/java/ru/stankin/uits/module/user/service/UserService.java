package ru.stankin.uits.module.user.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.stankin.uits.common.InvalidOldPasswordException;
import ru.stankin.uits.common.NotFoundException;
import ru.stankin.uits.module.user.dto.UserResponseDto;
import ru.stankin.uits.module.user.entity.User;
import ru.stankin.uits.module.user.mapper.UserMapper;
import ru.stankin.uits.module.user.repository.UserRepository;

import java.time.OffsetDateTime;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserMapper userMapper;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public UserResponseDto getUserProfile(User user) {
        return userMapper.toDto(user);
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
}