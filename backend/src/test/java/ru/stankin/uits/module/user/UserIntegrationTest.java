package ru.stankin.uits.module.user;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import ru.stankin.uits.AbstractIntegrationTest;
import ru.stankin.uits.module.auth.controller.AuthController;
import ru.stankin.uits.module.user.dto.ChangePasswordRequest;
import ru.stankin.uits.module.user.dto.UserResponseDto;
import ru.stankin.uits.module.user.dto.UserUpdateRequestDto;
import ru.stankin.uits.module.user.entity.User;
import ru.stankin.uits.security.JwtService;
import ru.stankin.uits.security.SecurityUser;

import java.io.IOException;
import java.nio.file.Files;
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

    @Test
    void shouldUpdateProfile_WhenRequestIsValid() throws IOException {
        String avatarKey = storeFile("avatars");

        ResponseEntity<UserResponseDto> response = restTemplate.exchange(
                "/api/users/profile",
                HttpMethod.PUT,
                withToken(updateRequest("Иван", "Иванов", avatarKey)),
                UserResponseDto.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        UserResponseDto profile = response.getBody();
        assertThat(profile).isNotNull();
        assertThat(profile.getFirstName()).isEqualTo("Иван");
        assertThat(profile.getLastName()).isEqualTo("Иванов");
        assertThat(profile.getAvatar()).isEqualTo(avatarKey);
        assertThat(profile.getAvatarUrl()).isEqualTo("/media/" + avatarKey);

        User stored = userRepository.findByUsername("prof_ivanov").orElseThrow();
        assertThat(stored.getFirstName()).isEqualTo("Иван");
        assertThat(stored.getAvatar()).isEqualTo(avatarKey);
    }

    /**
     * PUT заменяет карточку целиком: не присланное поле очищается. Форма правки обязана
     * отправлять все три поля, иначе правка аватара сотрёт имя.
     */
    @Test
    void shouldClearFields_WhenTheyAreOmitted() throws IOException {
        restTemplate.exchange("/api/users/profile", HttpMethod.PUT,
                withToken(updateRequest("Иван", "Иванов", storeFile("avatars"))), UserResponseDto.class);

        ResponseEntity<UserResponseDto> response = restTemplate.exchange(
                "/api/users/profile",
                HttpMethod.PUT,
                withToken(updateRequest(null, null, null)),
                UserResponseDto.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getFirstName()).isNull();
        assertThat(response.getBody().getAvatar()).isNull();
        assertThat(response.getBody().getAvatarUrl()).isNull();
    }

    /**
     * Логин, почта и флаги ролей в этой форме не редактируются: в старом портале
     * тот же запрос позволял выдать себе доступ в админку (MIGRATION §7 п.8).
     */
    @Test
    void shouldIgnoreFieldsOutsideTheForm_WhenTheyArePassed() {
        String body = """
                {
                  "firstName": "Иван",
                  "username": "hacker",
                  "email": "hacker@example.com",
                  "superuser": true,
                  "moderator": true,
                  "telegramCode": "123456"
                }""";
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(validToken);
        headers.setContentType(MediaType.APPLICATION_JSON);

        ResponseEntity<UserResponseDto> response = restTemplate.exchange(
                "/api/users/profile", HttpMethod.PUT, new HttpEntity<>(body, headers), UserResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);

        User stored = userRepository.findByUsername("prof_ivanov").orElseThrow();
        assertThat(stored.getFirstName()).isEqualTo("Иван");
        assertThat(stored.getEmail()).isNull();
        assertThat(stored.isSuperuser()).isFalse();
        assertThat(stored.isModerator()).isFalse();
        assertThat(stored.getTelegramCode()).isNull();
    }

    @Test
    void shouldReturn400_WhenAvatarFileIsMissing() {
        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/users/profile",
                HttpMethod.PUT,
                withToken(updateRequest("Иван", "Иванов", "avatars/never-existed.jpg")),
                ProblemDetail.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getDetail()).contains("Файл аватара не найден");
    }

    /**
     * Ключ из чужого раздела, замаскированный под аватар: приняв его, портал отдал бы
     * обложку новости как аватар и удалил бы её при следующей правке профиля.
     */
    @Test
    void shouldReturn400_WhenAvatarKeyClimbsIntoOtherCategory() throws IOException {
        String foreignKey = storeFile("news");
        String disguisedKey = "avatars/../" + foreignKey;

        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/users/profile",
                HttpMethod.PUT,
                withToken(updateRequest("Иван", "Иванов", disguisedKey)),
                ProblemDetail.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(Files.exists(STORAGE_ROOT.resolve(foreignKey))).isTrue();
    }

    @Test
    void shouldDeleteOldAvatarFile_WhenAvatarReplaced() throws IOException {
        String oldKey = storeFile("avatars");
        String newKey = storeFile("avatars");
        restTemplate.exchange("/api/users/profile", HttpMethod.PUT,
                withToken(updateRequest("Иван", "Иванов", oldKey)), UserResponseDto.class);

        restTemplate.exchange("/api/users/profile", HttpMethod.PUT,
                withToken(updateRequest("Иван", "Иванов", newKey)), UserResponseDto.class);

        assertThat(Files.exists(STORAGE_ROOT.resolve(oldKey))).isFalse();
        assertThat(Files.exists(STORAGE_ROOT.resolve(newKey))).isTrue();
    }

    @Test
    void shouldReturn400WithFieldErrors_WhenFirstNameIsTooLong() {
        ResponseEntity<String> response = restTemplate.exchange(
                "/api/users/profile",
                HttpMethod.PUT,
                withToken(updateRequest("И".repeat(151), "Иванов", null)),
                String.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).contains("firstName");
        assertThat(response.getBody()).contains("\"instance\":\"/api/users/profile\"");
    }

    private UserUpdateRequestDto updateRequest(String firstName, String lastName, String avatar) {
        UserUpdateRequestDto body = new UserUpdateRequestDto();
        body.setFirstName(firstName);
        body.setLastName(lastName);
        body.setAvatar(avatar);

        return body;
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
