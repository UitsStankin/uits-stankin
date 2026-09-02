package ru.stankin.uits.security;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import ru.stankin.uits.AbstractIntegrationTest;
import ru.stankin.uits.TestRole;
import ru.stankin.uits.module.auth.controller.AuthController;
import ru.stankin.uits.module.user.entity.User;

import static org.assertj.core.api.Assertions.assertThat;

class DjangoPasswordMigrationIntegrationTest extends AbstractIntegrationTest {

    private static final String DJANGO_HASH_OF_TEST_PASSWORD =
            "pbkdf2_sha256$600000$hR3kQv2NpZ8tLmXbYc1wDf$5p3elFfPLNfw3Hnt90l5tX24VMpe/PZsH7p2YLgT+wA=";

    private static final String CYRILLIC_PASSWORD = "пароль-Ы";

    private static final String DJANGO_HASH_OF_CYRILLIC_PASSWORD =
            "pbkdf2_sha256$600000$Kd9sTvB4nQzXeR7mLpYw2A$ihpmV9DeYlPAXa3+T57N+ItK0KN8bFHYMddBRxcimVY=";

    private User withStoredHash(String username, String hash) {
        User user = createUser(username, TestRole.USER);
        user.setPassword(hash);

        return userRepository.save(user);
    }

    private String storedHash(String username) {
        return userRepository.findByUsername(username).orElseThrow().getPassword();
    }

    private ResponseEntity<String> loginRaw(String username, String password) {
        return restTemplate.postForEntity(
                "/api/users/auth/login",
                new AuthController.LoginRequest(username, password),
                String.class
        );
    }

    @Test
    void djangoHashLetsOldUserIn() {
        withStoredHash("django_user", DJANGO_HASH_OF_TEST_PASSWORD);

        assertThat(loginRaw("django_user", TEST_PASSWORD).getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void firstLoginRehashesDjangoHashToBcrypt() {
        withStoredHash("django_user", DJANGO_HASH_OF_TEST_PASSWORD);

        loginRaw("django_user", TEST_PASSWORD);

        assertThat(storedHash("django_user"))
                .doesNotStartWith("pbkdf2_sha256$")
                .startsWith("$2");
    }

    @Test
    void rehashedUserLogsInWithTheSamePassword() {
        withStoredHash("django_user", DJANGO_HASH_OF_TEST_PASSWORD);

        assertThat(loginRaw("django_user", TEST_PASSWORD).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(loginRaw("django_user", TEST_PASSWORD).getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void nonAsciiPasswordMatchesDjangoHash() {
        withStoredHash("cyrillic_user", DJANGO_HASH_OF_CYRILLIC_PASSWORD);

        assertThat(loginRaw("cyrillic_user", CYRILLIC_PASSWORD).getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void wrongPasswordAgainstDjangoHashIsRejected() {
        withStoredHash("django_user", DJANGO_HASH_OF_TEST_PASSWORD);

        assertThat(loginRaw("django_user", "не тот пароль").getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(storedHash("django_user")).isEqualTo(DJANGO_HASH_OF_TEST_PASSWORD);
    }

    @Test
    void malformedDjangoHashIsRejectedWithoutServerError() {
        withStoredHash("broken_user", "pbkdf2_sha256$сколько-то$соль$хеш");

        assertThat(loginRaw("broken_user", TEST_PASSWORD).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void bcryptHashIsLeftAloneOnLogin() {
        createUser("bcrypt_user", TestRole.USER);
        String before = storedHash("bcrypt_user");

        assertThat(loginRaw("bcrypt_user", TEST_PASSWORD).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(storedHash("bcrypt_user")).isEqualTo(before);
    }
}
