package ru.stankin.uits.module.auth;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import ru.stankin.uits.AbstractIntegrationTest;
import ru.stankin.uits.TestRole;
import ru.stankin.uits.module.auth.controller.AuthController;
import ru.stankin.uits.module.auth.service.RefreshCookieFactory;
import ru.stankin.uits.module.user.dto.ChangePasswordRequest;
import ru.stankin.uits.module.user.entity.User;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class RefreshTokenIntegrationTest extends AbstractIntegrationTest {

    private static final String USERNAME = "session_user";
    private static final String NEW_PASSWORD = "new_password_1";

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    @DisplayName("Логин кладёт refresh в httpOnly-cookie, а в базу — только его хеш")
    void login_IssuesHttpOnlyCookieAndStoresOnlyHash() {
        createUser(USERNAME, TestRole.USER);

        ResponseEntity<AuthController.LoginResponse> response = loginResponse(USERNAME);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getHeaders().getFirst(HttpHeaders.SET_COOKIE))
                .contains(RefreshCookieFactory.COOKIE_NAME + "=")
                .contains("HttpOnly")
                .contains("SameSite=Lax")
                .contains("Path=/api/users/auth");

        String rawToken = refreshCookieValue(response);
        List<String> hashes = jdbcTemplate.queryForList("select token_hash from refresh_token", String.class);

        assertThat(hashes).hasSize(1);
        assertThat(hashes.getFirst()).hasSize(64).isNotEqualTo(rawToken);
    }

    @Test
    @DisplayName("Обмен выдаёт рабочий access-токен и новую cookie")
    void refresh_RotatesCookieAndReturnsWorkingAccessToken() {
        createUser(USERNAME, TestRole.USER);
        String firstCookie = refreshCookieValue(loginResponse(USERNAME));

        ResponseEntity<AuthController.LoginResponse> refreshed = refresh(firstCookie);

        assertThat(refreshed.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(refreshed.getBody()).isNotNull();
        assertThat(refreshCookieValue(refreshed)).isNotEqualTo(firstCookie);
        assertThat(profileStatus(refreshed.getBody().accessToken())).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("Обмен без cookie — 401")
    void refresh_WithoutCookie_Returns401() {
        assertThat(refresh(null).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @DisplayName("Две вкладки в grace-окне получают по своему токену, сессия жива")
    void refresh_WithinGracePeriod_KeepsSessionAlive() {
        createUser(USERNAME, TestRole.USER);
        String cookie = refreshCookieValue(loginResponse(USERNAME));

        ResponseEntity<AuthController.LoginResponse> first = refresh(cookie);
        ResponseEntity<AuthController.LoginResponse> second = refresh(cookie);

        assertThat(first.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(second.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(refreshCookieValue(second)).isNotEqualTo(refreshCookieValue(first));
    }

    @Test
    @DisplayName("Использованный токен вне grace-окна отзывает всё семейство")
    void refresh_WithUsedTokenOutsideGracePeriod_RevokesFamily() {
        createUser(USERNAME, TestRole.USER);
        String stolen = refreshCookieValue(loginResponse(USERNAME));

        String issued = refreshCookieValue(refresh(stolen));
        ageUsedTokens();

        assertThat(refresh(stolen).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(refresh(issued).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @DisplayName("Выход стирает cookie и закрывает сессию")
    void logout_ClearsCookieAndClosesSession() {
        createUser(USERNAME, TestRole.USER);
        String cookie = refreshCookieValue(loginResponse(USERNAME));

        ResponseEntity<Void> response = restTemplate.exchange(
                "/api/users/auth/logout", HttpMethod.POST, withCookie(cookie), Void.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(response.getHeaders().getFirst(HttpHeaders.SET_COOKIE)).contains("Max-Age=0");
        assertThat(refresh(cookie).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @DisplayName("Смена пароля убивает и выданный access-токен, и открытую сессию")
    void passwordChange_KillsAccessTokenAndSession() {
        createUser(USERNAME, TestRole.USER);
        ResponseEntity<AuthController.LoginResponse> login = loginResponse(USERNAME);
        assertThat(login.getBody()).isNotNull();

        String accessToken = login.getBody().accessToken();
        String cookie = refreshCookieValue(login);
        assertThat(profileStatus(accessToken)).isEqualTo(HttpStatus.OK);

        assertThat(changePassword(accessToken).getStatusCode()).isEqualTo(HttpStatus.OK);

        assertThat(profileStatus(accessToken)).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(refresh(cookie).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @DisplayName("Заблокированная учётка не может обновить сессию")
    void refresh_WhenAccountBlocked_Returns401() {
        User user = createUser(USERNAME, TestRole.USER);
        String cookie = refreshCookieValue(loginResponse(USERNAME));

        user.setActive(false);
        userRepository.save(user);

        assertThat(refresh(cookie).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    private void ageUsedTokens() {
        jdbcTemplate.update("update refresh_token set used_at = used_at - interval '5 minutes' "
                + "where used_at is not null");
    }

    private ResponseEntity<AuthController.LoginResponse> refresh(String cookieValue) {
        return restTemplate.exchange(
                "/api/users/auth/refresh",
                HttpMethod.POST,
                withCookie(cookieValue),
                AuthController.LoginResponse.class
        );
    }

    private HttpStatusCode profileStatus(String accessToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);

        return restTemplate.exchange(
                "/api/users/profile", HttpMethod.GET, new HttpEntity<>(null, headers), String.class
        ).getStatusCode();
    }

    private ResponseEntity<Void> changePassword(String accessToken) {
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setOldPassword(TEST_PASSWORD);
        request.setNewPassword(NEW_PASSWORD);

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setContentType(MediaType.APPLICATION_JSON);

        return restTemplate.exchange(
                "/api/users/change-password", HttpMethod.POST, new HttpEntity<>(request, headers), Void.class);
    }

    private HttpEntity<Void> withCookie(String cookieValue) {
        HttpHeaders headers = new HttpHeaders();

        if (cookieValue != null) {
            headers.add(HttpHeaders.COOKIE, RefreshCookieFactory.COOKIE_NAME + "=" + cookieValue);
        }

        return new HttpEntity<>(null, headers);
    }
}
