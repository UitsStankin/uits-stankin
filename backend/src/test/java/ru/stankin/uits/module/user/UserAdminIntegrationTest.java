package ru.stankin.uits.module.user;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import ru.stankin.uits.AbstractIntegrationTest;
import ru.stankin.uits.module.auth.controller.AuthController;
import ru.stankin.uits.module.auth.service.RefreshCookieFactory;
import ru.stankin.uits.TestRole;
import ru.stankin.uits.common.PageResponseDto;
import ru.stankin.uits.module.staff.dto.TeacherDetailsResponseDto;
import ru.stankin.uits.module.staff.dto.TeacherRequestDto;
import ru.stankin.uits.module.user.dto.PasswordResetRequestDto;
import ru.stankin.uits.module.user.dto.UserAdminResponseDto;
import ru.stankin.uits.module.user.dto.UserAdminUpdateRequestDto;
import ru.stankin.uits.module.user.dto.UserCreateRequestDto;
import ru.stankin.uits.module.user.entity.User;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

public class UserAdminIntegrationTest extends AbstractIntegrationTest {

    private static final long MISSING_ID = 999_999L;
    private static final String NEW_PASSWORD = "brand_new_password";

    private String adminToken;

    @BeforeEach
    void setUp() {
        createUser("admin_user", TestRole.ADMIN);
        adminToken = login("admin_user");
    }

    @Test
    void getUsers_ReturnsAllUsersSortedByUsername() {
        saveUser("petrov", "Пётр", "Петров", "petrov@stankin.ru", true, TestRole.USER);
        saveUser("ivanov", "Иван", "Иванов", "ivanov@stankin.ru", true, TestRole.MODERATOR);

        PageResponseDto<UserAdminResponseDto> body = getUsers("/api/users");

        assertThat(body.totalElements()).isEqualTo(3);
        assertThat(usernames(body)).containsExactly("admin_user", "ivanov", "petrov");
    }

    @Test
    void getUsers_DoesNotExposePasswordAndTelegramCode() {
        User ivanov = saveUser("ivanov", "Иван", "Иванов", "ivanov@stankin.ru", true, TestRole.USER);
        ivanov.setTelegramCode("tg-secret");
        userRepository.save(ivanov);

        ResponseEntity<String> response = restTemplate.exchange(
                "/api/users", HttpMethod.GET, withToken(adminToken), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody())
                .doesNotContain("password")
                .doesNotContain("telegramCode")
                .doesNotContain("tokensNotBefore");
    }

    @Test
    void getUsers_FindsByPartOfLastNameIgnoringCase() {
        saveUser("ivanov", "Иван", "Иванов", "ivanov@stankin.ru", true, TestRole.USER);
        saveUser("petrov", "Пётр", "Петров", "petrov@stankin.ru", true, TestRole.USER);

        PageResponseDto<UserAdminResponseDto> body = getUsers("/api/users?q={q}", "ивАНОВ");

        assertThat(usernames(body)).containsExactly("ivanov");
    }

    @Test
    void getUsers_FindsByPartOfEmail() {
        saveUser("ivanov", "Иван", "Иванов", "ivanov@stankin.ru", true, TestRole.USER);
        saveUser("petrov", "Пётр", "Петров", "petrov@mail.ru", true, TestRole.USER);

        PageResponseDto<UserAdminResponseDto> body = getUsers("/api/users?q={q}", "@stankin");

        assertThat(usernames(body)).containsExactly("ivanov");
    }

    @Test
    void getUsers_IgnoresBlankQuery() {
        saveUser("ivanov", "Иван", "Иванов", "ivanov@stankin.ru", true, TestRole.USER);

        PageResponseDto<UserAdminResponseDto> body = getUsers("/api/users?q=");

        assertThat(body.totalElements()).isEqualTo(2);
    }

    @Test
    void getUsers_TreatsPercentAsLiteralCharacter() {
        saveUser("ivanov", "Иван", "Иванов", "ivanov@stankin.ru", true, TestRole.USER);

        PageResponseDto<UserAdminResponseDto> body = getUsers("/api/users?q={q}", "%");

        assertThat(body.totalElements()).isZero();
    }

    @Test
    void getUsers_TreatsUnderscoreAsLiteralCharacter() {
        saveUser("ivanov", "Иван", "Иванов", "ivanov@stankin.ru", true, TestRole.USER);
        saveUser("iva_nov", "Пётр", "Петров", "petrov@stankin.ru", true, TestRole.USER);

        PageResponseDto<UserAdminResponseDto> body = getUsers("/api/users?q={q}", "_");

        assertThat(usernames(body)).containsExactly("admin_user", "iva_nov");
    }

    @Test
    void getUsers_FiltersByActive() {
        saveUser("blocked", "Иван", "Иванов", "ivanov@stankin.ru", false, TestRole.USER);
        saveUser("petrov", "Пётр", "Петров", "petrov@stankin.ru", true, TestRole.USER);

        assertThat(usernames(getUsers("/api/users?active=false"))).containsExactly("blocked");
        assertThat(usernames(getUsers("/api/users?active=true"))).containsExactly("admin_user", "petrov");
    }

    @Test
    void getUsers_FiltersByRole() {
        saveUser("moderator", "Иван", "Иванов", "ivanov@stankin.ru", true, TestRole.MODERATOR);
        saveUser("teacher", "Пётр", "Петров", "petrov@stankin.ru", true, TestRole.TEACHER);
        saveUser("plain", "Семён", "Семёнов", "semenov@stankin.ru", true, TestRole.USER);

        assertThat(usernames(getUsers("/api/users?role=admin"))).containsExactly("admin_user");
        assertThat(usernames(getUsers("/api/users?role=moderator"))).containsExactly("moderator");
        assertThat(usernames(getUsers("/api/users?role=teacher"))).containsExactly("teacher");
        assertThat(usernames(getUsers("/api/users?role=user"))).containsExactly("plain");
    }

    @Test
    void getUsers_CombinesSearchAndFilter() {
        saveUser("ivanov", "Иван", "Иванов", "ivanov@stankin.ru", true, TestRole.MODERATOR);
        saveUser("ivanova", "Ирина", "Иванова", "ivanova@stankin.ru", true, TestRole.USER);

        PageResponseDto<UserAdminResponseDto> body =
                getUsers("/api/users?q={q}&role=moderator", "иванов");

        assertThat(usernames(body)).containsExactly("ivanov");
    }

    @Test
    void getUsers_RejectsUnknownRole() {
        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/users?role=root", HttpMethod.GET, withToken(adminToken), ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getDetail()).isEqualTo("Неизвестная роль: root");
    }

    @Test
    void getUsers_RejectsUnknownSortField() {
        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/users?sort=foo", HttpMethod.GET, withToken(adminToken), ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getDetail()).contains("foo");
    }

    @Test
    void getUsers_SortsByRequestedField() {
        saveUser("ivanov", "Иван", "Яшин", "ivanov@stankin.ru", true, TestRole.USER);
        saveUser("petrov", "Пётр", "Аистов", "petrov@stankin.ru", true, TestRole.USER);

        PageResponseDto<UserAdminResponseDto> body = getUsers("/api/users?sort=lastName");

        assertThat(usernames(body)).containsExactly("petrov", "ivanov", "admin_user");
    }

    @Test
    void getUser_ReturnsCardById() {
        User ivanov = saveUser("ivanov", "Иван", "Иванов", "ivanov@stankin.ru", true, TestRole.MODERATOR);

        ResponseEntity<UserAdminResponseDto> response = restTemplate.exchange(
                "/api/users/" + ivanov.getId(), HttpMethod.GET, withToken(adminToken), UserAdminResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        UserAdminResponseDto body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.getUsername()).isEqualTo("ivanov");
        assertThat(body.getLastName()).isEqualTo("Иванов");
        assertThat(body.isModerator()).isTrue();
        assertThat(body.isActive()).isTrue();
    }

    @Test
    void getUser_Returns404_WhenUserIsMissing() {
        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/users/" + MISSING_ID, HttpMethod.GET, withToken(adminToken), ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void createUser_CreatesAccountThatCanLogIn() {
        UserCreateRequestDto request = createRequest("novikov");
        request.setModerator(true);

        ResponseEntity<UserAdminResponseDto> response = restTemplate.exchange(
                "/api/users", HttpMethod.POST, withToken(request, adminToken), UserAdminResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        UserAdminResponseDto created = response.getBody();
        assertThat(created).isNotNull();
        assertThat(created.getUsername()).isEqualTo("novikov");
        assertThat(created.isModerator()).isTrue();
        assertThat(created.isActive()).isTrue();
        assertThat(response.getHeaders().getLocation()).hasPath("/api/users/" + created.getId());

        assertThat(login("novikov")).isNotBlank();
    }

    @Test
    void createUser_DoesNotReturnPassword() {
        ResponseEntity<String> response = restTemplate.exchange(
                "/api/users", HttpMethod.POST, withToken(createRequest("novikov"), adminToken), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody())
                .doesNotContain("password")
                .doesNotContain(TEST_PASSWORD);
    }

    @Test
    void createUser_RejectsTakenUsername() {
        saveUser("novikov", "Иван", "Новиков", "novikov@stankin.ru", true, TestRole.USER);

        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/users", HttpMethod.POST, withToken(createRequest("novikov"), adminToken), ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getDetail()).isEqualTo("Логин уже занят: novikov");
    }

    @Test
    void createUser_RejectsShortPassword() {
        UserCreateRequestDto request = createRequest("novikov");
        request.setPassword("short");

        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/users", HttpMethod.POST, withToken(request, adminToken), ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getProperties()).containsKey("errors");
        assertThat(userRepository.findByUsername("novikov")).isEmpty();
    }

    @Test
    void updateUser_ChangesFieldsAndRoles() {
        User ivanov = saveUser("ivanov", "Иван", "Иванов", "ivanov@stankin.ru", true, TestRole.USER);

        UserAdminUpdateRequestDto request = updateRequest();
        request.setFirstName("Иннокентий");
        request.setEmail("new@stankin.ru");
        request.setModerator(true);

        ResponseEntity<UserAdminResponseDto> response = restTemplate.exchange(
                "/api/users/" + ivanov.getId(), HttpMethod.PUT,
                withToken(request, adminToken), UserAdminResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getFirstName()).isEqualTo("Иннокентий");
        assertThat(response.getBody().isModerator()).isTrue();

        User stored = userRepository.findById(ivanov.getId()).orElseThrow();
        assertThat(stored.getEmail()).isEqualTo("new@stankin.ru");
        assertThat(stored.isModerator()).isTrue();
        assertThat(stored.getUsername()).isEqualTo("ivanov");
    }

    @Test
    void updateUser_BlocksAccountAndCutsItsAccess() {
        User ivanov = saveUser("ivanov", "Иван", "Иванов", "ivanov@stankin.ru", true, TestRole.USER);
        String ivanovToken = login("ivanov");

        UserAdminUpdateRequestDto request = updateRequest();
        request.setActive(false);

        ResponseEntity<UserAdminResponseDto> response = restTemplate.exchange(
                "/api/users/" + ivanov.getId(), HttpMethod.PUT,
                withToken(request, adminToken), UserAdminResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);

        ResponseEntity<ProblemDetail> afterBlock = restTemplate.exchange(
                "/api/users/profile", HttpMethod.GET, withToken(ivanovToken), ProblemDetail.class);

        assertThat(afterBlock.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void updateUser_RejectsSelfDemotion() {
        Long adminId = userRepository.findByUsername("admin_user").orElseThrow().getId();

        UserAdminUpdateRequestDto request = updateRequest();
        request.setSuperuser(false);

        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/users/" + adminId, HttpMethod.PUT, withToken(request, adminToken), ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(userRepository.findByUsername("admin_user").orElseThrow().isSuperuser()).isTrue();
    }

    @Test
    void updateUser_RejectsSelfBlocking() {
        Long adminId = userRepository.findByUsername("admin_user").orElseThrow().getId();

        UserAdminUpdateRequestDto request = updateRequest();
        request.setSuperuser(true);
        request.setActive(false);

        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/users/" + adminId, HttpMethod.PUT, withToken(request, adminToken), ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(userRepository.findByUsername("admin_user").orElseThrow().isActive()).isTrue();
    }

    @Test
    void updateUser_RejectsBodyWithoutActive() {
        User ivanov = saveUser("ivanov", "Иван", "Иванов", "ivanov@stankin.ru", true, TestRole.USER);

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(adminToken);
        headers.setContentType(MediaType.APPLICATION_JSON);
        String body = "{\"superuser\": false, \"moderator\": false, \"teacher\": false}";

        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/users/" + ivanov.getId(), HttpMethod.PUT,
                new HttpEntity<>(body, headers), ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(userRepository.findById(ivanov.getId()).orElseThrow().isActive()).isTrue();
    }

    @Test
    void updateUser_Returns404_WhenUserIsMissing() {
        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/users/" + MISSING_ID, HttpMethod.PUT,
                withToken(updateRequest(), adminToken), ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void updateUser_Returns409_WhenTeacherRoleRemovedFromAccountWithLinkedCard() {
        User ivanov = saveUser("ivanov", "Иван", "Иванов", "ivanov@stankin.ru", true, TestRole.TEACHER);
        long cardId = createLinkedCard(ivanov.getId());

        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/users/" + ivanov.getId(), HttpMethod.PUT,
                withToken(updateRequest(), adminToken), ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getDetail()).isEqualTo(
                "К учётной записи привязана карточка преподавателя id=" + cardId + ", сначала отвязать её");
        assertThat(userRepository.findById(ivanov.getId()).orElseThrow().isTeacher()).isTrue();
    }

    @Test
    void updateUser_RemovesTeacherRole_AfterCardIsUnlinked() {
        User ivanov = saveUser("ivanov", "Иван", "Иванов", "ivanov@stankin.ru", true, TestRole.TEACHER);
        long cardId = createLinkedCard(ivanov.getId());
        unlinkCard(cardId);

        ResponseEntity<UserAdminResponseDto> response = restTemplate.exchange(
                "/api/users/" + ivanov.getId(), HttpMethod.PUT,
                withToken(updateRequest(), adminToken), UserAdminResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(userRepository.findById(ivanov.getId()).orElseThrow().isTeacher()).isFalse();
    }

    private long createLinkedCard(Long userId) {
        ResponseEntity<TeacherDetailsResponseDto> response = restTemplate.exchange(
                "/api/teachers", HttpMethod.POST,
                withToken(cardRequest().userId(userId).build(), adminToken), TeacherDetailsResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();

        return response.getBody().getId();
    }

    private void unlinkCard(long cardId) {
        ResponseEntity<TeacherDetailsResponseDto> response = restTemplate.exchange(
                "/api/teachers/" + cardId, HttpMethod.PUT,
                withToken(cardRequest().build(), adminToken), TeacherDetailsResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    private static TeacherRequestDto.TeacherRequestDtoBuilder cardRequest() {
        return TeacherRequestDto.builder()
                .lastName("Иванов")
                .firstName("Иван")
                .position("доцент");
    }

    private UserCreateRequestDto createRequest(String username) {
        UserCreateRequestDto request = new UserCreateRequestDto();
        request.setUsername(username);
        request.setPassword(TEST_PASSWORD);
        request.setEmail(username + "@stankin.ru");
        request.setFirstName("Иван");
        request.setLastName("Новиков");

        return request;
    }

    private UserAdminUpdateRequestDto updateRequest() {
        UserAdminUpdateRequestDto request = new UserAdminUpdateRequestDto();
        request.setSuperuser(false);
        request.setModerator(false);
        request.setTeacher(false);
        request.setActive(true);

        return request;
    }

    private <T> HttpEntity<T> withToken(T body, String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);

        return new HttpEntity<>(body, headers);
    }

    @Test
    void resetPassword_SetsNewPasswordAndCutsOldSessions() {
        User ivanov = saveUser("ivanov", "Иван", "Иванов", "ivanov@stankin.ru", true, TestRole.USER);
        String ivanovToken = login("ivanov");

        ResponseEntity<Void> response = restTemplate.exchange(
                "/api/users/" + ivanov.getId() + "/reset-password", HttpMethod.POST,
                withToken(resetRequest(NEW_PASSWORD), adminToken), Void.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(profileStatus(ivanovToken)).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(loginStatus("ivanov", TEST_PASSWORD)).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(loginStatus("ivanov", NEW_PASSWORD)).isEqualTo(HttpStatus.OK);
    }

    @Test
    void resetPassword_CutsRefreshSession() {
        User ivanov = saveUser("ivanov", "Иван", "Иванов", "ivanov@stankin.ru", true, TestRole.USER);
        String refreshToken = refreshCookieValue(loginResponse("ivanov"));

        restTemplate.exchange(
                "/api/users/" + ivanov.getId() + "/reset-password", HttpMethod.POST,
                withToken(resetRequest(NEW_PASSWORD), adminToken), Void.class);

        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.COOKIE, RefreshCookieFactory.COOKIE_NAME + "=" + refreshToken);

        ResponseEntity<ProblemDetail> refreshed = restTemplate.exchange(
                "/api/users/auth/refresh", HttpMethod.POST, new HttpEntity<>(headers), ProblemDetail.class);

        assertThat(refreshed.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void resetPassword_RejectsShortPassword() {
        User ivanov = saveUser("ivanov", "Иван", "Иванов", "ivanov@stankin.ru", true, TestRole.USER);

        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/users/" + ivanov.getId() + "/reset-password", HttpMethod.POST,
                withToken(resetRequest("short"), adminToken), ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(loginStatus("ivanov", TEST_PASSWORD)).isEqualTo(HttpStatus.OK);
    }

    @Test
    void resetPassword_Returns404_WhenUserIsMissing() {
        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/users/" + MISSING_ID + "/reset-password", HttpMethod.POST,
                withToken(resetRequest(NEW_PASSWORD), adminToken), ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void terminateSessions_CutsAccessAndKeepsPassword() {
        User ivanov = saveUser("ivanov", "Иван", "Иванов", "ivanov@stankin.ru", true, TestRole.USER);
        String ivanovToken = login("ivanov");

        ResponseEntity<Void> response = restTemplate.exchange(
                "/api/users/" + ivanov.getId() + "/logout", HttpMethod.POST,
                withToken(adminToken), Void.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(profileStatus(ivanovToken)).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(loginStatus("ivanov", TEST_PASSWORD)).isEqualTo(HttpStatus.OK);
    }

    @Test
    void terminateSessions_Returns404_WhenUserIsMissing() {
        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/users/" + MISSING_ID + "/logout", HttpMethod.POST,
                withToken(adminToken), ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    private PasswordResetRequestDto resetRequest(String password) {
        PasswordResetRequestDto request = new PasswordResetRequestDto();
        request.setNewPassword(password);

        return request;
    }

    private HttpStatus profileStatus(String token) {
        return (HttpStatus) restTemplate.exchange(
                "/api/users/profile", HttpMethod.GET, withToken(token), String.class).getStatusCode();
    }

    private HttpStatus loginStatus(String username, String password) {
        return (HttpStatus) restTemplate.postForEntity(
                "/api/users/auth/login",
                new AuthController.LoginRequest(username, password),
                String.class).getStatusCode();
    }

    private PageResponseDto<UserAdminResponseDto> getUsers(String url, Object... variables) {
        ResponseEntity<PageResponseDto<UserAdminResponseDto>> response = restTemplate.exchange(
                url, HttpMethod.GET, withToken(adminToken), new ParameterizedTypeReference<>() {}, variables);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();

        return response.getBody();
    }

    private static List<String> usernames(PageResponseDto<UserAdminResponseDto> page) {
        return page.content().stream().map(UserAdminResponseDto::getUsername).toList();
    }

    private User saveUser(
            String username,
            String firstName,
            String lastName,
            String email,
            boolean active,
            TestRole role
    ) {
        return userRepository.save(User.builder()
                .username(username)
                .password(passwordEncoder.encode(TEST_PASSWORD))
                .firstName(firstName)
                .lastName(lastName)
                .email(email)
                .active(active)
                .superuser(role == TestRole.ADMIN)
                .moderator(role == TestRole.MODERATOR)
                .teacher(role == TestRole.TEACHER)
                .build());
    }

    private HttpEntity<Void> withToken(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);

        return new HttpEntity<>(headers);
    }
}
