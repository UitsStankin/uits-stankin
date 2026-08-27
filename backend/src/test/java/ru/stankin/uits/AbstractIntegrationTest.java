package ru.stankin.uits;

import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureTestRestTemplate;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Testcontainers;
import ru.stankin.uits.module.auth.controller.AuthController;
import ru.stankin.uits.module.user.entity.User;
import ru.stankin.uits.module.user.repository.UserRepository;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.HttpCookie;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@AutoConfigureTestRestTemplate
// Явный профиль, чтобы не сработал spring.profiles.default=dev
// и DevDataSeeder не наполнял тестовую базу
@ActiveProfiles("test")
public abstract class AbstractIntegrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    protected TestRestTemplate restTemplate;

    @Autowired
    protected UserRepository userRepository;

    @Autowired
    protected PasswordEncoder passwordEncoder;

    protected static final String JWT_SECRET = "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970";

    /** Пароль всех пользователей, созданных через {@link #createUser}. */
    protected static final String TEST_PASSWORD = "password";

    /**
     * Каталог файлового хранилища на весь прогон тестов.
     *
     * <p>Он один на всю иерархию намеренно. Свой {@code @DynamicPropertySource}
     * в каждом классе давал бы каждому свой путь, а путь входит в ключ кэша
     * контекста Spring — контекст поднимался бы заново под каждый такой класс.
     * Общая константа = один контекст на все интеграционные тесты.
     *
     * <p>Временный каталог, а не {@code ./media} проекта: тесты не должны
     * оставлять мусор в рабочей папке. Ключи файлов содержат UUID,
     * поэтому классы не мешают друг другу.
     */
    protected static final Path STORAGE_ROOT;

    static {
        try {
            STORAGE_ROOT = Files.createTempDirectory("uits-media-test");
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @BeforeEach
    void cleanDatabase() {
        jdbcTemplate.execute("TRUNCATE TABLE refresh_token, news_post, news_conferenceannouncement, "
                + "achievements_achievement, employee_teacher, subject_subject, "
                + "employee_helpersemployee, users_user RESTART IDENTITY CASCADE");
    }

    static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17-alpine");

    static {
        postgres.start();
    }

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);

        registry.add("application.security.jwt.secret-key", () -> JWT_SECRET);
        registry.add("application.security.jwt.expiration", () -> 86400000);

        registry.add("application.storage.root", STORAGE_ROOT::toString);
    }

    /** Файл в хранилище под ключом вида {@code <prefix>/<uuid>.jpg}; на выходе — ключ. */
    protected String storeFile(String prefix) throws IOException {
        String key = prefix + "/" + UUID.randomUUID() + ".jpg";
        Path target = STORAGE_ROOT.resolve(key);
        Files.createDirectories(target.getParent());
        Files.writeString(target, "содержимое картинки");

        return key;
    }

    /**
     * Пользователь с перечисленными ролями и паролем {@link #TEST_PASSWORD}.
     *
     * <p>Пароль обязан лежать в базе BCrypt-хешем: и логин, и смена пароля
     * сверяют его через {@code passwordEncoder.matches()}, сырая строка там
     * всегда даст false.
     */
    protected User createUser(String username, TestRole... roles) {
        Set<TestRole> granted = Set.of(roles);

        return userRepository.save(User.builder()
                .username(username)
                .password(passwordEncoder.encode(TEST_PASSWORD))
                .superuser(granted.contains(TestRole.ADMIN))
                .moderator(granted.contains(TestRole.MODERATOR))
                .teacher(granted.contains(TestRole.TEACHER))
                .active(true)
                .build());
    }

    /**
     * Логин уже созданного пользователя, на выходе — access-токен.
     *
     * <p>Токен берётся через настоящий {@code POST /api/users/auth/login},
     * а не собирается {@code JwtService} напрямую: так в проверке участвует
     * весь путь, по которому ходит фронт, включая {@code JwtAuthenticationFilter}.
     */
    protected String login(String username) {
        ResponseEntity<AuthController.LoginResponse> response = loginResponse(username);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();

        return response.getBody().accessToken();
    }

    /** Тот же логин, но целиком: телу нужен access-токен, заголовкам — cookie с refresh-токеном. */
    protected ResponseEntity<AuthController.LoginResponse> loginResponse(String username) {
        return restTemplate.postForEntity(
                "/api/users/auth/login",
                new AuthController.LoginRequest(username, TEST_PASSWORD),
                AuthController.LoginResponse.class
        );
    }

    /** Значение refresh-токена из заголовка {@code Set-Cookie} ответа. */
    protected static String refreshCookieValue(ResponseEntity<?> response) {
        String setCookie = response.getHeaders().getFirst(HttpHeaders.SET_COOKIE);
        assertThat(setCookie).isNotNull();

        return HttpCookie.parse(setCookie).getFirst().getValue();
    }
}
