package ru.stankin.uits.module.auth.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
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

    public record LoginRequest(String username, String password) {}
    public record LoginResponse(String accessToken) {}

    @PostMapping("/login")
    public LoginResponse login(@RequestBody LoginRequest request) {

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password())
        );

        SecurityUser user = (SecurityUser) authentication.getPrincipal();

        userService.updateLastLogin(user.getUser().getId());

        String jwtToken = jwtService.generateToken(user);

        return new LoginResponse(jwtToken);
    }
}