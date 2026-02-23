package ru.stankin.uits.module.user.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ru.stankin.uits.module.user.dto.UserResponseDto;
import ru.stankin.uits.module.user.service.UserService;
import ru.stankin.uits.security.SecurityUser;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/profile")
    public UserResponseDto getMyProfile(@AuthenticationPrincipal SecurityUser securityUser) {
        return userService.getUserProfile(securityUser.getUser());
    }
}