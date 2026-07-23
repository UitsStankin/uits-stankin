package ru.stankin.uits.module.auth;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import ru.stankin.uits.AbstractIntegrationTest;
import ru.stankin.uits.module.auth.controller.AuthController;
import ru.stankin.uits.module.user.entity.User;
import ru.stankin.uits.module.user.repository.UserRepository;

import java.time.OffsetDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class AuthIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void shouldReturnToken_WhenLoginAndPasswordAreCorrect() {
        User user = new User();
        user.setUsername("student_ivan");
        user.setPassword(passwordEncoder.encode("super_password"));
        user.setActive(true);
        user.setSuperuser(false);
        user.setStaff(false);
        user.setModerator(false);
        user.setTeacher(false);
        user.setDateJoined(OffsetDateTime.now());

        userRepository.save(user);

        var loginRequest = new AuthController.LoginRequest("student_ivan", "super_password");

        ResponseEntity<AuthController.LoginResponse> response = restTemplate.postForEntity(
                "/api/users/auth/login",
                loginRequest,
                AuthController.LoginResponse.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().access_token()).isNotBlank();
    }

    @Test
    void shouldReturn401_WhenPasswordIsWrong() {
        User user = new User();
        user.setUsername("hacker");
        user.setPassword(passwordEncoder.encode("real_pass"));
        user.setActive(true);
        user.setDateJoined(OffsetDateTime.now());
        userRepository.save(user);

        var badRequest = new AuthController.LoginRequest("hacker", "wrong_pass");

        ResponseEntity<Object> response = restTemplate.postForEntity(
                "/api/users/auth/login",
                badRequest,
                Object.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}