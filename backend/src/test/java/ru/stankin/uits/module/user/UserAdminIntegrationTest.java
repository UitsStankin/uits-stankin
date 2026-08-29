package ru.stankin.uits.module.user;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import ru.stankin.uits.AbstractIntegrationTest;
import ru.stankin.uits.TestRole;
import ru.stankin.uits.common.PageResponseDto;
import ru.stankin.uits.module.user.dto.UserAdminResponseDto;
import ru.stankin.uits.module.user.entity.User;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

public class UserAdminIntegrationTest extends AbstractIntegrationTest {

    private static final long MISSING_ID = 999_999L;

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
