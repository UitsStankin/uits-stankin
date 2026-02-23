package ru.stankin.uits.module.user.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import ru.stankin.uits.module.user.dto.UserResponseDto;
import ru.stankin.uits.module.user.entity.User;
import ru.stankin.uits.module.user.mapper.UserMapper;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserMapper userMapper;

    public UserResponseDto getUserProfile(User user) {
        return userMapper.toDto(user);
    }
}