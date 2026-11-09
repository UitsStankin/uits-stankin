package ru.stankin.uits.module.user.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ru.stankin.uits.common.PageResponseDto;
import ru.stankin.uits.module.user.dto.UserDirectoryDto;
import ru.stankin.uits.module.user.service.UserService;

@RestController
@RequestMapping("/api/users/directory")
@RequiredArgsConstructor
public class UserDirectoryController {

    private final UserService userService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR', 'TEACHER')")
    public PageResponseDto<UserDirectoryDto> getTeacherDirectory(
            @PageableDefault(size = 50, sort = {"lastName", "firstName", "id"}) Pageable pageable
    ) {
        return userService.getTeacherDirectory(pageable);
    }
}
