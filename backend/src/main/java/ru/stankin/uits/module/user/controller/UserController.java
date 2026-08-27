package ru.stankin.uits.module.user.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import ru.stankin.uits.module.user.dto.ChangePasswordRequest;
import ru.stankin.uits.module.user.dto.UserResponseDto;
import ru.stankin.uits.module.user.dto.UserUpdateRequestDto;
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

    @PutMapping("/profile")
    public UserResponseDto updateMyProfile(
            @AuthenticationPrincipal SecurityUser securityUser,
            @Valid @RequestBody UserUpdateRequestDto request
    ) {
        return userService.updateProfile(securityUser.getUser().getId(), request);
    }

    @PostMapping("/change-password")
    public void changePassword(
            @AuthenticationPrincipal SecurityUser securityUser,
            @Valid @RequestBody ChangePasswordRequest request
    ) {
        userService.changePassword(securityUser.getUser(), request.getOldPassword(), request.getNewPassword());
    }
}
