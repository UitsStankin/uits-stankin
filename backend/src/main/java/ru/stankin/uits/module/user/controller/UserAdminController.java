package ru.stankin.uits.module.user.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import ru.stankin.uits.common.PageResponseDto;
import ru.stankin.uits.module.user.dto.UserAdminResponseDto;
import ru.stankin.uits.module.user.service.UserAdminService;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserAdminController {

    private final UserAdminService userAdminService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public PageResponseDto<UserAdminResponseDto> getUsers(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) String role,
            @PageableDefault(size = 20, sort = {"username", "id"}) Pageable pageable
    ) {
        return userAdminService.getUsers(q, active, role, pageable);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public UserAdminResponseDto getUser(@PathVariable Long id) {
        return userAdminService.getUser(id);
    }
}
