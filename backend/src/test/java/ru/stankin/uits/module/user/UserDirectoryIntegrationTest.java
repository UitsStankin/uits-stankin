package ru.stankin.uits.module.user;

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
import ru.stankin.uits.module.user.dto.UserDirectoryDto;
import ru.stankin.uits.module.user.entity.User;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class UserDirectoryIntegrationTest extends AbstractIntegrationTest {

    private User account(String username, String lastName, String firstName, boolean active, TestRole... roles) {
        User user = createUser(username, roles);
        user.setLastName(lastName);
        user.setFirstName(firstName);
        user.setEmail(username + "@stankin.ru");
        user.setActive(active);

        return userRepository.save(user);
    }

    private HttpHeaders auth(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);

        return headers;
    }

    private ResponseEntity<PageResponseDto<UserDirectoryDto>> directory(String token) {
        return directory(token, "");
    }

    private ResponseEntity<PageResponseDto<UserDirectoryDto>> directory(String token, String query) {
        return restTemplate.exchange(
                "/api/users/directory" + query,
                HttpMethod.GET,
                new HttpEntity<>(auth(token)),
                new ParameterizedTypeReference<>() {
                }
        );
    }

    private List<UserDirectoryDto> entries(String token) {
        return entries(token, "");
    }

    private List<UserDirectoryDto> entries(String token, String query) {
        ResponseEntity<PageResponseDto<UserDirectoryDto>> response = directory(token, query);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();

        return response.getBody().content();
    }

    @Test
    void directoryListsOnlyActiveTeacherAccounts() {
        account("yakovlev", "Яковлев", "Иван", true, TestRole.TEACHER);
        account("abramov", "Абрамов", "Пётр", true, TestRole.TEACHER);
        account("blocked", "Блокирован", "Олег", false, TestRole.TEACHER);
        account("moder", "Модератов", "Илья", true, TestRole.MODERATOR);
        account("plain", "Простов", "Роман", true, TestRole.USER);

        assertThat(entries(login("abramov")))
                .extracting(UserDirectoryDto::getLastName)
                .containsExactly("Абрамов", "Яковлев");
    }

    @Test
    void directoryCarriesNeitherLoginNorEmail() {
        account("yakovlev", "Яковлев", "Иван", true, TestRole.TEACHER);

        ResponseEntity<String> response = restTemplate.exchange(
                "/api/users/directory",
                HttpMethod.GET,
                new HttpEntity<>(auth(login("yakovlev"))),
                String.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody())
                .contains("Яковлев")
                .doesNotContain("yakovlev")
                .doesNotContain("@stankin.ru");
    }

    @Test
    void directoryIsOpenToModeratorAndAdmin() {
        account("teach", "Яковлев", "Иван", true, TestRole.TEACHER);
        account("moder", "Модератов", "Илья", true, TestRole.MODERATOR);
        account("admin", "Админов", "Артём", true, TestRole.ADMIN);

        assertThat(entries(login("moder"))).extracting(UserDirectoryDto::getLastName).containsExactly("Яковлев");
        assertThat(entries(login("admin"))).extracting(UserDirectoryDto::getLastName).containsExactly("Яковлев");
    }

    @Test
    void directoryIsOpenToPlainUser() {
        account("teach", "Яковлев", "Иван", true, TestRole.TEACHER);
        account("plain", "Простов", "Роман", true, TestRole.USER);

        assertThat(entries(login("plain")))
                .extracting(UserDirectoryDto::getLastName)
                .containsExactly("Яковлев");
    }

    @Test
    void directoryScopeAllIncludesNonTeacherActiveStaffAndExcludesInactive() {
        account("yakovlev", "Яковлев", "Иван", true, TestRole.TEACHER);
        account("moder", "Модератов", "Илья", true, TestRole.MODERATOR);
        account("plain", "Простов", "Роман", true, TestRole.USER);
        account("blocked", "Блокирован", "Олег", false, TestRole.USER);

        assertThat(entries(login("plain"), "?scope=TEACHERS"))
                .extracting(UserDirectoryDto::getLastName)
                .containsExactly("Яковлев");

        assertThat(entries(login("plain"), "?scope=ALL"))
                .extracting(UserDirectoryDto::getLastName)
                .containsExactly("Модератов", "Простов", "Яковлев");
    }

    @Test
    void directoryRejectsSensitiveSortFieldsWith400() {
        account("plain", "Простов", "Роман", true, TestRole.USER);
        String token = login("plain");

        for (String field : List.of("email", "username", "password")) {
            ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                    "/api/users/directory?sort=" + field,
                    HttpMethod.GET,
                    new HttpEntity<>(auth(token)),
                    ProblemDetail.class
            );
            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        }
    }

    @Test
    void directoryIsClosedToAnonymous() {
        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/users/directory",
                HttpMethod.GET,
                null,
                ProblemDetail.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
