package ru.stankin.uits.config;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.AppenderBase;
import liquibase.exception.LiquibaseException;
import liquibase.integration.spring.SpringLiquibase;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureTestRestTemplate;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import ru.stankin.uits.common.RequestIdFilter;
import ru.stankin.uits.module.auth.controller.AuthController;

import java.nio.file.Path;
import java.util.Map;
import java.util.Properties;
import java.util.UUID;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Фиксирует поведение прод-профиля: что открыто наружу, а чего в проде быть не должно.
 *
 * Отдельная база сохраняет результат прод-миграций для проверки первого входа.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureTestRestTemplate
@Testcontainers
@ActiveProfiles("prod")
class ProdProfileIntegrationTest {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17-alpine");

    @TempDir
    static Path storage;
    private static final String INITIAL_PASSWORD = UUID.randomUUID().toString();

    @DynamicPropertySource
    static void configure(DynamicPropertyRegistry registry) {
        String hash = new BCryptPasswordEncoder().encode(INITIAL_PASSWORD);
        registry.add("BOOTSTRAP_ADMIN_HASH", () -> hash);
        registry.add("JWT_SECRET_KEY", () -> "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970");
        registry.add("application.storage.root", storage::toString);
    }

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private JdbcTemplate jdbc;

    private DriverManagerDataSource newSchema(String schema) {
        jdbc.execute("CREATE SCHEMA " + schema);
        var source = new DriverManagerDataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword());
        var properties = new Properties();
        properties.setProperty("currentSchema", schema);
        source.setConnectionProperties(properties);
        return source;
    }

    private void migrate(DriverManagerDataSource source, String context, String hash) throws LiquibaseException {
        var migration = new SpringLiquibase();
        migration.setDataSource(source);
        migration.setChangeLog("classpath:db/changelog/db.changelog-master.yaml");
        migration.setContexts(context);
        migration.setChangeLogParameters(Map.of("bootstrapAdminHash", hash));
        migration.afterPropertiesSet();
    }

    @Test
    void upgradeKeepsExistingAdministratorWithoutBootstrapSecret() throws LiquibaseException {
        var source = newSchema("existing_admin");
        migrate(source, "test", "");
        var database = new JdbcTemplate(source);
        assertThat(database.queryForObject("SELECT count(*) FROM users_user", Integer.class)).isZero();
        String originalHash = new BCryptPasswordEncoder().encode(UUID.randomUUID().toString());
        database.update("INSERT INTO users_user (username, password, is_superuser, date_joined)"
                + " VALUES ('existing', ?, true, now())", originalHash);
        migrate(source, "prod", "");
        assertThat(database.queryForList("SELECT username FROM users_user", String.class)).containsExactly("existing");
        assertThat(database.queryForObject("SELECT password FROM users_user", String.class)).isEqualTo(originalHash);
    }

    @Test
    void failedBootstrapCanRetryAndAppliedBootstrapDoesNotNeedTheHash() throws LiquibaseException {
        var source = newSchema("bootstrap_retry");
        assertThatThrownBy(() -> migrate(source, "prod", ""))
                .hasStackTraceContaining("BOOTSTRAP_ADMIN_HASH");
        assertThatThrownBy(() -> migrate(source, "prod", "invalid"))
                .hasStackTraceContaining("BOOTSTRAP_ADMIN_HASH");
        var database = new JdbcTemplate(source);
        assertThat(database.queryForObject("SELECT count(*) FROM users_user", Integer.class)).isZero();
        String hash = new BCryptPasswordEncoder().encode(UUID.randomUUID().toString());
        migrate(source, "prod", hash);
        migrate(source, "prod", "");
        assertThat(database.queryForList("SELECT password FROM users_user", String.class)).containsExactly(hash);
    }

    @Test
    void firstAdminCanLogInAndChangePassword() {
        assertThat(jdbc.queryForList("SELECT username FROM users_user WHERE is_superuser", String.class))
                .containsExactly("admin");
        String loginUrl = "/api/users/auth/login";
        var firstLogin = new AuthController.LoginRequest("admin", INITIAL_PASSWORD);
        var response = restTemplate.postForEntity(loginUrl, firstLogin, AuthController.LoginResponse.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        var headers = new HttpHeaders();
        headers.setBearerAuth(response.getBody().accessToken());
        String newPassword = UUID.randomUUID().toString();
        var change = new HttpEntity<>(Map.of("oldPassword", INITIAL_PASSWORD, "newPassword", newPassword), headers);
        assertThat(restTemplate.postForEntity("/api/users/change-password", change, Void.class).getStatusCode())
                .isEqualTo(HttpStatus.OK);
        assertThat(restTemplate.postForEntity(loginUrl, firstLogin, String.class).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
        var secondLogin = new AuthController.LoginRequest("admin", newPassword);
        assertThat(restTemplate.postForEntity(loginUrl, secondLogin, String.class).getStatusCode())
                .isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("Health отвечает без токена — деплою есть чем проверить, что приложение живо")
    void health_WhenNoToken_Returns200() {
        ResponseEntity<String> response = restTemplate.getForEntity("/actuator/health", String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).contains("\"status\":\"UP\"");
    }

    @Test
    @DisplayName("Health отдаёт только статус: show-details = never")
    void health_WhenNoToken_HidesComponentDetails() {
        ResponseEntity<String> response = restTemplate.getForEntity("/actuator/health", String.class);

        // Статус проверяется и здесь: без него тест проходит и на 401,
        // где в теле ProblemDetail слова "components" тоже нет
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).doesNotContain("components");
    }

    @Test
    @DisplayName("Readiness отвечает: probes включены, деплою есть чем дождаться готовности")
    void readiness_WhenNoToken_Returns200() {
        ResponseEntity<String> response =
                restTemplate.getForEntity("/actuator/health/readiness", String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).contains("\"status\":\"UP\"");
    }

    @Test
    @DisplayName("Открыт только health: корень actuator требует аутентификации")
    void actuatorRoot_WhenNoToken_Returns401() {
        ResponseEntity<String> response = restTemplate.getForEntity("/actuator", String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @DisplayName("Схема OpenAPI в проде не отдаётся")
    void apiDocs_InProdProfile_Returns404() {
        ResponseEntity<String> response = restTemplate.getForEntity("/v3/api-docs", String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    @DisplayName("Страница Swagger UI в проде не отдаётся")
    void swaggerUi_InProdProfile_Returns404() {
        ResponseEntity<String> response =
                restTemplate.getForEntity("/swagger-ui/index.html", String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @ParameterizedTest
    @CsvSource({"/api/public/news, 200", "/api/events, 401"})
    void apiRequestIdMatchesLog(String path, int status) throws InterruptedException {
        Logger logger = (Logger) LoggerFactory.getLogger(RequestIdFilter.class);
        var logEvents = new LinkedBlockingQueue<ILoggingEvent>();
        var appender = new AppenderBase<ILoggingEvent>() {
            @Override
            protected void append(ILoggingEvent event) {
                event.prepareForDeferredProcessing();
                logEvents.add(event);
            }
        };
        appender.start();
        logger.addAppender(appender);
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set(RequestIdFilter.HEADER_NAME, "supplied-by-client");
            ResponseEntity<String> response =
                    restTemplate.exchange(path, HttpMethod.GET, new HttpEntity<>(headers), String.class);

            assertThat(response.getStatusCode().value()).isEqualTo(status);
            String requestId = response.getHeaders().getFirst(RequestIdFilter.HEADER_NAME);
            assertThat(requestId).matches("[a-f0-9-]{36}");

            assertThat(logEvents.poll(3, TimeUnit.SECONDS)).isNotNull().satisfies(event -> {
                assertThat(event.getMDCPropertyMap()).containsEntry("requestId", requestId);
                assertThat(event.getKeyValuePairs()).anySatisfy(field -> {
                    assertThat(field.key).isEqualTo("status");
                    assertThat(field.value).isEqualTo(status);
                });
            });
        } finally {
            logger.detachAppender(appender);
            appender.stop();
        }
    }
}
