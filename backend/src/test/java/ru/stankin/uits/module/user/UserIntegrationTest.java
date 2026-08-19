package ru.stankin.uits.module.user;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import ru.stankin.uits.AbstractIntegrationTest;
import ru.stankin.uits.module.auth.controller.AuthController;
import ru.stankin.uits.module.user.dto.ChangePasswordRequest;
import ru.stankin.uits.module.user.dto.UserResponseDto;
import ru.stankin.uits.module.user.entity.User;
import ru.stankin.uits.security.JwtService;
import ru.stankin.uits.security.SecurityUser;

import java.time.OffsetDateTime;

import static org.assertj.core.api.AssertionsForClassTypes.assertThat;


public class UserIntegrationTest extends AbstractIntegrationTest {

    private static final String OLD_PASSWORD = "super_password";
    private static final String NEW_PASSWORD = "new_super_password";

    @Autowired
    private JwtService jwtService; // Token for test

    private String validToken;

    @BeforeEach
    void setUp() {
        User user = User.builder()
                .username("prof_ivanov")
                // Пароль обязан лежать в базе BCrypt-хешем: сервис проверяет его
                // через passwordEncoder.matches(), сырая строка там всегда даст false
                .password(passwordEncoder.encode(OLD_PASSWORD))
                .active(true)
                .superuser(false)
                .staff(false)
                .moderator(false)
                .teacher(true)
                .dateJoined(OffsetDateTime.now())
                .build();

        User savedUser = userRepository.save(user);

        validToken = jwtService.generateToken(new SecurityUser(savedUser));
    }

    @Test
    void shouldReturnProfile_WhenTokenIsProvided() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + validToken);

        HttpEntity<Void> requestEntity = new HttpEntity<>(null, headers);

        ResponseEntity<UserResponseDto> response = restTemplate.exchange(
                "/api/users/profile",
                HttpMethod.GET,
                requestEntity,
                UserResponseDto.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        UserResponseDto profile = response.getBody();
        assertThat(profile).isNotNull();
        assertThat(profile.getUsername()).isEqualTo("prof_ivanov");
        assertThat(profile.isTeacher()).isTrue();
    }

    @Test
    void shouldChangePassword_WhenOldPasswordIsCorrect() {
        ResponseEntity<Void> response = restTemplate.exchange(
                "/api/users/change-password",
                HttpMethod.POST,
                withToken(changeRequest(OLD_PASSWORD, NEW_PASSWORD)),
                Void.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);

        // Смена проверяется через логин, а не через сравнение хешей в базе:
        // так тест фиксирует поведение всего контура, а не деталь реализации
        assertThat(loginWithPassword(OLD_PASSWORD).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);

        ResponseEntity<AuthController.LoginResponse> loginWithNew = loginWithPassword(NEW_PASSWORD);
        assertThat(loginWithNew.getStatusCode()).isEqualTo(HttpStatus.OK);
        AuthController.LoginResponse loginBody = loginWithNew.getBody();
        assertThat(loginBody).isNotNull();
        assertThat(loginBody.accessToken()).isNotBlank();
    }

    @Test
    void shouldReturn400_WhenOldPasswordIsWrong() {
        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/users/change-password",
                HttpMethod.POST,
                withToken(changeRequest("wrong_old_password", NEW_PASSWORD)),
                ProblemDetail.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        ProblemDetail problem = response.getBody();
        assertThat(problem).isNotNull();
        assertThat(problem.getDetail()).isEqualTo("Старый пароль введён неверно.");

        // Пароль не должен был измениться
        assertThat(loginWithPassword(OLD_PASSWORD).getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void shouldReturn400WithFieldErrors_WhenNewPasswordIsBlank() {
        ResponseEntity<String> response = restTemplate.exchange(
                "/api/users/change-password",
                HttpMethod.POST,
                withToken(changeRequest("any_password", "")),
                String.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).contains("newPassword");
        assertThat(response.getBody()).contains("\"timestamp\"");
        assertThat(response.getBody()).contains("\"instance\":\"/api/users/change-password\"");
    }

    @Test
    void shouldReturn400_WhenNewPasswordIsTooShort() {
        ResponseEntity<String> response = restTemplate.exchange(
                "/api/users/change-password",
                HttpMethod.POST,
                withToken(changeRequest("any_password", "1234567")),
                String.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).contains("Пароль должен быть минимум 8 символов");
    }

    private ChangePasswordRequest changeRequest(String oldPassword, String newPassword) {
        ChangePasswordRequest body = new ChangePasswordRequest();
        body.setOldPassword(oldPassword);
        body.setNewPassword(newPassword);
        return body;
    }

    private <T> HttpEntity<T> withToken(T body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(validToken);
        return new HttpEntity<>(body, headers);
    }

    private ResponseEntity<AuthController.LoginResponse> loginWithPassword(String password) {
        return restTemplate.postForEntity(
                "/api/users/auth/login",
                new AuthController.LoginRequest("prof_ivanov", password),
                AuthController.LoginResponse.class
        );
    }
}
