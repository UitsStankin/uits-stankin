package ru.stankin.uits.module.user.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriComponentsBuilder;
import ru.stankin.uits.common.PageResponseDto;
import ru.stankin.uits.module.user.dto.UserAdminResponseDto;
import ru.stankin.uits.module.user.dto.UserAdminUpdateRequestDto;
import ru.stankin.uits.module.user.dto.UserCreateRequestDto;
import ru.stankin.uits.module.user.service.UserAdminService;
import ru.stankin.uits.security.SecurityUser;

import java.net.URI;

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

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserAdminResponseDto> createUser(@Valid @RequestBody UserCreateRequestDto request) {
        UserAdminResponseDto created = userAdminService.createUser(request);
        URI location = UriComponentsBuilder.fromPath("/api/users/{id}")
                .buildAndExpand(created.getId())
                .toUri();

        return ResponseEntity.created(location).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public UserAdminResponseDto updateUser(
            @AuthenticationPrincipal SecurityUser securityUser,
            @PathVariable Long id,
            @Valid @RequestBody UserAdminUpdateRequestDto request
    ) {
        return userAdminService.updateUser(id, securityUser.getUser().getId(), request);
    }
}
