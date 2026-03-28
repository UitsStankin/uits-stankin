package ru.stankin.uits.module.user;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.http.*;
import ru.stankin.uits.AbstractIntegrationTest;
import ru.stankin.uits.module.user.dto.UserResponseDto;
import ru.stankin.uits.module.user.entity.User;
import ru.stankin.uits.module.user.repository.UserRepository;
import ru.stankin.uits.security.JwtService;
import ru.stankin.uits.security.SecurityUser;

import java.time.OffsetDateTime;

import static org.assertj.core.api.AssertionsForClassTypes.assertThat;


public class UserIntegrationTest extends AbstractIntegrationTest {
    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtService jwtService; // Token for test

    private String validToken;

    @BeforeEach
    void setUp() {
        User user = User.builder()
                .username("prof_ivanov")
                .password("super_password")
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
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getUsername()).isEqualTo("prof_ivanov");
        assertThat(response.getBody().isTeacher()).isTrue();
    }

    @Test
    void shouldReturn403_WhenNoTokenProvided() {
        HttpEntity<Void> emptyRequest = new HttpEntity<>(null, (HttpHeaders) null);

        ResponseEntity<Object> response = restTemplate.exchange(
                "/api/users/profile",
                HttpMethod.GET,
                emptyRequest,
                Object.class
        );

        assertThat(response.getStatusCode().is4xxClientError()).isTrue();
    }
}
