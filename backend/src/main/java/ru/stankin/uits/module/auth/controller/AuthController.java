package ru.stankin.uits.module.auth.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ru.stankin.uits.common.exception.InvalidRefreshTokenException;
import ru.stankin.uits.module.auth.service.RefreshCookieFactory;
import ru.stankin.uits.module.auth.service.RefreshTokenService;
import ru.stankin.uits.module.user.service.UserService;
import ru.stankin.uits.security.JwtService;
import ru.stankin.uits.security.SecurityUser;

@RestController
@RequestMapping("/api/users/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserService userService;
    private final RefreshTokenService refreshTokenService;
    private final RefreshCookieFactory refreshCookieFactory;

    public record LoginRequest(@NotBlank String username, @NotBlank String password) {}
    public record LoginResponse(String accessToken) {}

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password())
        );

        SecurityUser user = (SecurityUser) authentication.getPrincipal();

        userService.updateLastLogin(user.getUser().getId());

        String refreshToken = refreshTokenService.issue(user.getUser());

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookieFactory.create(refreshToken).toString())
                .body(new LoginResponse(jwtService.generateToken(user)));
    }

    @PostMapping("/refresh")
    public ResponseEntity<LoginResponse> refresh(
            @CookieValue(name = RefreshCookieFactory.COOKIE_NAME, required = false) String refreshToken
    ) {
        if (refreshToken == null) {
            throw new InvalidRefreshTokenException("Токен сессии не передан");
        }

        RefreshTokenService.Rotation rotation = refreshTokenService.rotate(refreshToken);

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookieFactory.create(rotation.refreshToken()).toString())
                .body(new LoginResponse(jwtService.generateToken(new SecurityUser(rotation.user()))));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @CookieValue(name = RefreshCookieFactory.COOKIE_NAME, required = false) String refreshToken
    ) {
        if (refreshToken != null) {
            refreshTokenService.revokeSession(refreshToken);
        }

        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, refreshCookieFactory.clear().toString())
                .build();
    }
}
