package ru.stankin.uits.security;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.servlet.mvc.method.RequestMappingInfo;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;
import ru.stankin.uits.AbstractIntegrationTest;
import ru.stankin.uits.TestRole;
import ru.stankin.uits.module.achievements.dto.AchievementRequestDto;
import ru.stankin.uits.module.auth.controller.AuthController;
import ru.stankin.uits.module.auth.service.RefreshCookieFactory;
import ru.stankin.uits.module.events.dto.UserEventRequestDto;
import ru.stankin.uits.module.events.enums.EventStatus;
import ru.stankin.uits.module.events.enums.NotificationFrequency;
import ru.stankin.uits.module.news.dto.ConferenceRequestDto;
import ru.stankin.uits.module.news.dto.NewsRequestDto;
import ru.stankin.uits.module.news.entity.NewsPost;
import ru.stankin.uits.module.news.repository.NewsRepository;
import ru.stankin.uits.module.pages.dto.EditablePageRequestDto;
import ru.stankin.uits.module.staff.dto.HelpersEmployeeRequestDto;
import ru.stankin.uits.module.staff.dto.SubjectRequestDto;
import ru.stankin.uits.module.staff.dto.TeacherRequestDto;
import ru.stankin.uits.module.publications.dto.PublicationRequestDto;
import ru.stankin.uits.module.publications.dto.TagRequestDto;
import ru.stankin.uits.module.students.dto.PostgraduateRequestDto;
import ru.stankin.uits.module.students.dto.StudentRequestDto;
import ru.stankin.uits.module.students.enums.EducationLevel;
import ru.stankin.uits.module.user.dto.ChangePasswordRequest;
import ru.stankin.uits.module.user.dto.PasswordResetRequestDto;
import ru.stankin.uits.module.user.dto.UserAdminUpdateRequestDto;
import ru.stankin.uits.module.user.dto.UserCreateRequestDto;
import ru.stankin.uits.module.user.dto.UserUpdateRequestDto;
import ru.stankin.uits.module.user.entity.User;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Матрица доступа: каждая ручка проекта против каждой роли (T-24).
 *
 * <p>Правила доступа живут в двух разных местах: URL-правила в
 * {@link SecurityConfig} (фильтр, срабатывает до контроллера) и
 * {@code @PreAuthorize} на методах контроллеров (AOP, срабатывает на входе
 * в метод). Забыть аннотацию легко, и тогда ручка молча уходит под общее
 * правило {@code anyRequest().authenticated()} — то есть открывается любому,
 * кто вообще залогинен. Здесь правила собраны в одну таблицу и проверяются
 * все разом, включая роль TEACHER, которой раньше не было ни в одном тесте.
 *
 * <p>Таблица {@link #MATRIX} — источник правды, а не документация: тест
 * {@link #everyControllerEndpointIsDeclaredInMatrix()} требует, чтобы каждая
 * зарегистрированная в Spring MVC ручка была в ней описана. Новая ручка
 * без строки в таблице роняет сборку, и решение о её доступности приходится
 * принимать явно.
 */
public class EndpointAccessMatrixTest extends AbstractIntegrationTest {

    @Autowired
    private NewsRepository newsRepository;

    /**
     * Именно бин {@code requestMappingHandlerMapping}, а не любой подходящий по типу:
     * springdoc и actuator регистрируют свои handler mapping, и внедрение по типу
     * стало бы неоднозначным.
     */
    @Autowired
    @Qualifier("requestMappingHandlerMapping")
    private RequestMappingHandlerMapping handlerMapping;

    /**
     * Кто стучится в ручку. ANONYMOUS ходит без заголовка Authorization,
     * остальные — с настоящим токеном, полученным через {@code /login}.
     */
    private enum Actor {
        ANONYMOUS("probe"),
        USER("plain_user", TestRole.USER),
        TEACHER("teacher_user", TestRole.TEACHER),
        MODERATOR("moderator_user", TestRole.MODERATOR),
        ADMIN("admin_user", TestRole.ADMIN);

        private final String username;
        private final TestRole[] roles;

        Actor(String username, TestRole... roles) {
            this.username = username;
            this.roles = roles;
        }
    }

    /** Откуда берётся ручка: обычный контроллер или инфраструктура Spring. */
    private enum Source {
        /** Метод контроллера — попадает в RequestMappingHandlerMapping и проверяется сторожем. */
        CONTROLLER,
        /**
         * Раздача статики ({@code /media}) и actuator: их обслуживают другие
         * handler mapping, в списке контроллерных ручек их нет. В матрице они
         * нужны — доступ у них тоже есть, — но сторож их не ищет.
         */
        INFRASTRUCTURE
    }

    private record Endpoint(HttpMethod method, String path, Set<Actor> allowed, Source source) {

        String key() {
            return method + " " + path;
        }

        @Override
        public String toString() {
            return key();
        }
    }

    private static final Set<Actor> ANYONE = EnumSet.allOf(Actor.class);
    private static final Set<Actor> AUTHENTICATED =
            EnumSet.of(Actor.USER, Actor.TEACHER, Actor.MODERATOR, Actor.ADMIN);
    private static final Set<Actor> EDITORS = EnumSet.of(Actor.MODERATOR, Actor.ADMIN);
    private static final Set<Actor> TEACHERS = EnumSet.of(Actor.TEACHER);
    private static final Set<Actor> TEACHERS_AND_ADMINS = EnumSet.of(Actor.TEACHER, Actor.ADMIN);
    private static final Set<Actor> EDITORS_AND_TEACHERS =
            EnumSet.of(Actor.TEACHER, Actor.MODERATOR, Actor.ADMIN);
    private static final Set<Actor> ADMINS = EnumSet.of(Actor.ADMIN);

    /**
     * Кто и куда имеет право. Третья колонка — те, кого ручка обязана пропустить
     * через контроль доступа; все остальные обязаны получить отказ.
     */
    private static final List<Endpoint> MATRIX = List.of(
            controller(HttpMethod.POST, "/api/users/auth/login", ANYONE),
            controller(HttpMethod.POST, "/api/users/auth/refresh", ANYONE),
            controller(HttpMethod.POST, "/api/users/auth/logout", ANYONE),
            controller(HttpMethod.GET, "/api/public/news", ANYONE),
            controller(HttpMethod.GET, "/api/public/news/{id}", ANYONE),
            controller(HttpMethod.GET, "/api/public/teachers", ANYONE),
            controller(HttpMethod.GET, "/api/public/teachers/{id}", ANYONE),
            controller(HttpMethod.GET, "/api/public/teachers/{id}/exams", ANYONE),
            controller(HttpMethod.GET, "/api/public/exams", ANYONE),
            controller(HttpMethod.GET, "/api/public/helpers", ANYONE),
            controller(HttpMethod.GET, "/api/public/helpers/{id}", ANYONE),
            controller(HttpMethod.GET, "/api/public/pages/{slug}", ANYONE),
            controller(HttpMethod.GET, "/api/public/conferences", ANYONE),
            controller(HttpMethod.GET, "/api/public/conferences/{id}", ANYONE),
            controller(HttpMethod.GET, "/api/public/achievements", ANYONE),
            controller(HttpMethod.GET, "/api/public/achievements/{id}", ANYONE),
            controller(HttpMethod.GET, "/api/public/teachers/{teacherId}/achievements", ANYONE),
            controller(HttpMethod.GET, "/api/public/teachers/{id}/schedule", ANYONE),
            controller(HttpMethod.GET, "/api/public/schedule", ANYONE),
            controller(HttpMethod.GET, "/api/public/exams/files", ANYONE),
            controller(HttpMethod.GET, "/api/public/postgraduates", ANYONE),
            controller(HttpMethod.GET, "/api/public/tags", ANYONE),
            controller(HttpMethod.GET, "/api/public/publications", ANYONE),
            controller(HttpMethod.GET, "/api/public/publications/{id}", ANYONE),
            controller(HttpMethod.GET, "/api/public/publications/authors", ANYONE),

            controller(HttpMethod.GET, "/api/users/profile", AUTHENTICATED),
            controller(HttpMethod.PUT, "/api/users/profile", AUTHENTICATED),
            controller(HttpMethod.POST, "/api/users/change-password", AUTHENTICATED),

            controller(HttpMethod.GET, "/api/users", ADMINS),
            controller(HttpMethod.GET, "/api/users/{id}", ADMINS),
            controller(HttpMethod.POST, "/api/users", ADMINS),
            controller(HttpMethod.PUT, "/api/users/{id}", ADMINS),
            controller(HttpMethod.POST, "/api/users/{id}/reset-password", ADMINS),
            controller(HttpMethod.POST, "/api/users/{id}/logout", ADMINS),
            controller(HttpMethod.GET, "/api/users/directory", EDITORS_AND_TEACHERS),

            controller(HttpMethod.GET, "/api/teachers/me", TEACHERS),
            controller(HttpMethod.PUT, "/api/teachers/me", TEACHERS),

            controller(HttpMethod.GET, "/api/events", TEACHERS_AND_ADMINS),
            controller(HttpMethod.GET, "/api/events/{id}", TEACHERS_AND_ADMINS),
            controller(HttpMethod.POST, "/api/events", TEACHERS_AND_ADMINS),
            controller(HttpMethod.PUT, "/api/events/{id}", TEACHERS_AND_ADMINS),
            controller(HttpMethod.DELETE, "/api/events/{id}", TEACHERS_AND_ADMINS),

            controller(HttpMethod.GET, "/api/news", EDITORS),
            controller(HttpMethod.GET, "/api/news/{id}", EDITORS),
            controller(HttpMethod.POST, "/api/news", EDITORS),
            controller(HttpMethod.PUT, "/api/news/{id}", EDITORS),
            controller(HttpMethod.DELETE, "/api/news/{id}", EDITORS),
            controller(HttpMethod.GET, "/api/conferences", EDITORS),
            controller(HttpMethod.GET, "/api/conferences/{id}", EDITORS),
            controller(HttpMethod.POST, "/api/conferences", EDITORS),
            controller(HttpMethod.PUT, "/api/conferences/{id}", EDITORS),
            controller(HttpMethod.DELETE, "/api/conferences/{id}", EDITORS),
            controller(HttpMethod.GET, "/api/achievements", EDITORS),
            controller(HttpMethod.GET, "/api/achievements/{id}", EDITORS),
            controller(HttpMethod.POST, "/api/achievements", EDITORS),
            controller(HttpMethod.PUT, "/api/achievements/{id}", EDITORS),
            controller(HttpMethod.DELETE, "/api/achievements/{id}", EDITORS),
            controller(HttpMethod.GET, "/api/postgraduates/{id}", EDITORS),
            controller(HttpMethod.POST, "/api/postgraduates", EDITORS),
            controller(HttpMethod.PUT, "/api/postgraduates/{id}", EDITORS),
            controller(HttpMethod.DELETE, "/api/postgraduates/{id}", EDITORS),
            controller(HttpMethod.POST, "/api/tags", EDITORS),
            controller(HttpMethod.PUT, "/api/tags/{id}", EDITORS),
            controller(HttpMethod.DELETE, "/api/tags/{id}", EDITORS),
            controller(HttpMethod.POST, "/api/publications", EDITORS),
            controller(HttpMethod.PUT, "/api/publications/{id}", EDITORS),
            controller(HttpMethod.DELETE, "/api/publications/{id}", EDITORS),
            controller(HttpMethod.GET, "/api/pages", EDITORS),
            controller(HttpMethod.PUT, "/api/pages/{slug}", EDITORS),
            controller(HttpMethod.POST, "/api/files", EDITORS),
            controller(HttpMethod.POST, "/api/teachers", EDITORS),
            controller(HttpMethod.PUT, "/api/teachers/{id}", EDITORS),
            controller(HttpMethod.DELETE, "/api/teachers/{id}", EDITORS),
            controller(HttpMethod.POST, "/api/teachers/{id}/schedule/import", EDITORS),
            controller(HttpMethod.POST, "/api/teachers/{id}/exams/import", EDITORS),
            controller(HttpMethod.POST, "/api/gradesheets/import", EDITORS),
            controller(HttpMethod.GET, "/api/subjects", EDITORS),
            controller(HttpMethod.POST, "/api/subjects", EDITORS),
            controller(HttpMethod.PUT, "/api/subjects/{id}", EDITORS),
            controller(HttpMethod.DELETE, "/api/subjects/{id}", EDITORS),
            controller(HttpMethod.POST, "/api/helpers", EDITORS),
            controller(HttpMethod.PUT, "/api/helpers/{id}", EDITORS),
            controller(HttpMethod.DELETE, "/api/helpers/{id}", EDITORS),

            infrastructure(HttpMethod.GET, "/media/{key}", ANYONE),
            infrastructure(HttpMethod.GET, "/actuator/health", ANYONE)
    );

    /**
     * Ручки, чьи правила доступа задаёт не проект: {@code /error} — резервный
     * обработчик Spring Boot, остальные — springdoc. Все они открыты
     * в {@link SecurityConfig} осознанно, springdoc вдобавок выключен целиком
     * в прод-профиле (ProdProfileIntegrationTest). Сравнение — по границе
     * сегмента пути, а не подстрокой: иначе будущая ручка вида
     * {@code GET /api/errors} молча выпадала бы из сторожа.
     */
    private static final List<String> NOT_OUR_ENDPOINTS =
            List.of("/error", "/v3/api-docs", "/v3/api-docs.yaml", "/swagger-ui", "/swagger-ui.html");

    private static final String MEDIA_KEY = "matrix/probe.txt";
    private static final String TEACHER_ID = "1";
    private static final String PAGE_SLUG = "home-before";
    private static final String PAGE_TITLE = "Главная: блок над новостями";

    static Stream<Arguments> cells() {
        return MATRIX.stream()
                .flatMap(endpoint -> Arrays.stream(Actor.values())
                        .map(actor -> Arguments.of(endpoint, actor)));
    }

    @ParameterizedTest(name = "{0} — {1}")
    @MethodSource("cells")
    void accessMatrix(Endpoint endpoint, Actor actor) {
        Fixture fixture = prepare(actor);
        String token = actor == Actor.ANONYMOUS ? null : login(actor.username);

        ResponseEntity<String> response = call(endpoint, fixture, token);

        if (endpoint.allowed().contains(actor)) {
            // Что именно ответила ручка — дело других тестов; здесь важно,
            // что запрос до неё дошёл, а не был отбит контролем доступа
            assertThat(response.getStatusCode())
                    .as("роль обязана проходить контроль доступа, тело ответа: %s", response.getBody())
                    .isNotIn(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN);
        } else if (actor == Actor.ANONYMOUS) {
            assertProblem(response, HttpStatus.UNAUTHORIZED, "Требуется аутентификация.");
        } else {
            // Отличать 403 от 401 обязательно: 401 на месте 403 означал бы,
            // что токен не разобрали, и проверка ролей вообще не участвовала
            assertProblem(response, HttpStatus.FORBIDDEN, "Недостаточно прав.");
        }
    }

    /**
     * Сторож полноты: список ручек берётся у самого Spring MVC, а не пишется руками.
     *
     * <p>Без него матрица — снимок на день написания: новый контроллер приедет
     * без строки в таблице, останется непроверенным, и тесты промолчат.
     */
    @Test
    void everyControllerEndpointIsDeclaredInMatrix() {
        Set<String> declared = MATRIX.stream()
                .filter(endpoint -> endpoint.source() == Source.CONTROLLER)
                .map(Endpoint::key)
                .collect(Collectors.toSet());

        assertThat(registeredEndpoints())
                .as("каждая ручка обязана быть в матрице доступа: лишнее слева — "
                        + "ручка без описанных прав, лишнее справа — строка про удалённую ручку")
                .containsExactlyInAnyOrderElementsOf(declared);
    }

    private Set<String> registeredEndpoints() {
        return handlerMapping.getHandlerMethods().keySet().stream()
                .flatMap(EndpointAccessMatrixTest::keysOf)
                .filter(key -> {
                    String path = key.substring(key.indexOf(' ') + 1);

                    return NOT_OUR_ENDPOINTS.stream()
                            .noneMatch(excluded -> path.equals(excluded) || path.startsWith(excluded + "/"));
                })
                .collect(Collectors.toSet());
    }

    private static Stream<String> keysOf(RequestMappingInfo info) {
        Set<String> patterns = info.getPatternValues();
        Set<RequestMethod> methods = info.getMethodsCondition().getMethods();

        // Пустой набор методов = ручка отвечает на любой метод. В проекте таких нет,
        // и ключ "ANY ..." не совпал бы ни с одной строкой матрицы — тест упадёт,
        // а не пропустит ручку молча
        Stream<String> names = methods.isEmpty()
                ? Stream.of("ANY")
                : methods.stream().map(Enum::name);

        return names.flatMap(method -> patterns.stream().map(pattern -> method + " " + pattern));
    }

    /**
     * Фикстура одной клетки. Пользователь создаётся всегда, даже для ANONYMOUS:
     * он нужен автором новости и валидными учётными данными для {@code /login} —
     * иначе публичная ручка логина ответила бы анониму 401 по своей собственной
     * логике, и клетка проверяла бы не права, а несуществующего пользователя.
     */
    private record Fixture(User user, Long newsId) {}

    private Fixture prepare(Actor actor) {
        User user = createUser(actor.username, actor.roles);

        NewsPost news = newsRepository.save(NewsPost.builder()
                .title("Матричная новость")
                .shortDescription("Фикстура теста доступа")
                .postType("news")
                .content("Содержимое")
                .display(true)
                .author(user)
                .build());

        writeMediaProbe();

        return new Fixture(user, news.getId());
    }

    private void writeMediaProbe() {
        Path probe = STORAGE_ROOT.resolve(MEDIA_KEY);

        try {
            Files.createDirectories(probe.getParent());
            Files.writeString(probe, "probe", StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private ResponseEntity<String> call(Endpoint endpoint, Fixture fixture, String token) {
        String path = endpoint.path()
                .replace("{id}", String.valueOf(fixture.newsId()))
                .replace("{teacherId}", TEACHER_ID)
                .replace("{key}", MEDIA_KEY)
                .replace("{slug}", PAGE_SLUG);

        HttpHeaders headers = new HttpHeaders();

        if (token != null) {
            headers.setBearerAuth(token);
        }

        return restTemplate.exchange(path, endpoint.method(), request(endpoint, fixture, headers), String.class);
    }

    /**
     * Тело запроса обязано быть валидным.
     *
     * <p>Аргументы метода контроллера разбираются ДО того, как сработает
     * {@code @PreAuthorize}: пустой запрос к {@code POST /api/files} упал бы
     * с 400 на отсутствующем multipart, так и не дойдя до проверки роли,
     * и клетка «обычный пользователь → 403» стала бы зелёной по ошибке.
     */
    private HttpEntity<?> request(Endpoint endpoint, Fixture fixture, HttpHeaders headers) {
        return switch (endpoint.key()) {
            case "POST /api/users/auth/login" ->
                    json(headers, new AuthController.LoginRequest(fixture.user().getUsername(), TEST_PASSWORD));
            case "POST /api/users/auth/refresh" -> {
                headers.add(HttpHeaders.COOKIE, RefreshCookieFactory.COOKIE_NAME + "="
                        + refreshCookieValue(loginResponse(fixture.user().getUsername())));
                yield new HttpEntity<>(null, headers);
            }
            case "PUT /api/users/profile" -> json(headers, profileRequest());
            case "POST /api/users" -> json(headers, createUserRequest());
            case "PUT /api/users/{id}" -> json(headers, adminUpdateRequest());
            case "POST /api/users/{id}/reset-password" -> json(headers, passwordResetRequest());
            case "POST /api/users/change-password" -> json(headers, changePasswordRequest());
            case "POST /api/news", "PUT /api/news/{id}" -> json(headers, newsRequest());
            case "POST /api/conferences", "PUT /api/conferences/{id}" -> json(headers, conferenceRequest());
            case "POST /api/achievements", "PUT /api/achievements/{id}" -> json(headers, achievementRequest());
            case "POST /api/postgraduates", "PUT /api/postgraduates/{id}" ->
                    json(headers, postgraduateRequest());
            case "POST /api/events", "PUT /api/events/{id}" -> json(headers, eventRequest());
            case "POST /api/tags", "PUT /api/tags/{id}" -> json(headers, tagRequest());
            case "POST /api/publications", "PUT /api/publications/{id}" ->
                    json(headers, publicationRequest());
            case "PUT /api/pages/{slug}" -> json(headers, pageRequest());
            case "POST /api/teachers", "PUT /api/teachers/{id}", "PUT /api/teachers/me" ->
                    json(headers, teacherRequest());
            case "POST /api/subjects", "PUT /api/subjects/{id}" -> json(headers, subjectRequest());
            case "POST /api/helpers", "PUT /api/helpers/{id}" -> json(headers, helperRequest());
            case "POST /api/files" -> multipart(headers);
            case "POST /api/teachers/{id}/schedule/import",
                 "POST /api/teachers/{id}/exams/import" -> schedulePdf(headers);
            case "POST /api/gradesheets/import" -> gradeSheetWorkbook(headers);
            default -> new HttpEntity<>(headers);
        };
    }

    private HttpEntity<?> schedulePdf(HttpHeaders headers) {
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", new ByteArrayResource("%PDF-1.4 matrix".getBytes(java.nio.charset.StandardCharsets.UTF_8)) {
            @Override
            public String getFilename() {
                return "matrix.pdf";
            }
        });

        return new HttpEntity<>(body, headers);
    }

    private HttpEntity<?> gradeSheetWorkbook(HttpHeaders headers) {
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", new ByteArrayResource("PK matrix".getBytes(java.nio.charset.StandardCharsets.UTF_8)) {
            @Override
            public String getFilename() {
                return "matrix.xlsx";
            }
        });

        return new HttpEntity<>(body, headers);
    }

    private HttpEntity<?> json(HttpHeaders headers, Object body) {
        headers.setContentType(MediaType.APPLICATION_JSON);

        return new HttpEntity<>(body, headers);
    }

    private HttpEntity<?> multipart(HttpHeaders headers) {
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", new ByteArrayResource(jpeg()) {
            @Override
            public String getFilename() {
                return "probe.jpg";
            }
        });
        body.add("category", "news");

        return new HttpEntity<>(body, headers);
    }

    private UserUpdateRequestDto profileRequest() {
        UserUpdateRequestDto request = new UserUpdateRequestDto();
        request.setFirstName("Матрица");
        request.setLastName("Доступа");

        return request;
    }

    private PasswordResetRequestDto passwordResetRequest() {
        PasswordResetRequestDto request = new PasswordResetRequestDto();
        request.setNewPassword("matrix_password");

        return request;
    }

    private UserCreateRequestDto createUserRequest() {
        UserCreateRequestDto request = new UserCreateRequestDto();
        request.setUsername("matrix_new_user");
        request.setPassword("matrix_password");

        return request;
    }

    private UserAdminUpdateRequestDto adminUpdateRequest() {
        UserAdminUpdateRequestDto request = new UserAdminUpdateRequestDto();
        request.setSuperuser(true);
        request.setModerator(false);
        request.setTeacher(false);
        request.setActive(true);

        return request;
    }

    private ChangePasswordRequest changePasswordRequest() {
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setOldPassword(TEST_PASSWORD);
        request.setNewPassword("matrix_password");

        return request;
    }

    private NewsRequestDto newsRequest() {
        return NewsRequestDto.builder()
                .title("Новость из матрицы")
                .shortDescription("Описание")
                .postType("news")
                .content("Содержимое")
                .display(true)
                .build();
    }

    private ConferenceRequestDto conferenceRequest() {
        return ConferenceRequestDto.builder()
                .title("Конференция из матрицы")
                .display(true)
                .build();
    }

    private AchievementRequestDto achievementRequest() {
        return AchievementRequestDto.builder()
                .title("Достижение из матрицы")
                .description("Описание")
                .content("Содержимое")
                .previewImage(MEDIA_KEY)
                .display(true)
                .build();
    }

    private PostgraduateRequestDto postgraduateRequest() {
        return PostgraduateRequestDto.builder()
                .student(StudentRequestDto.builder()
                        .lastName("Аспирантов")
                        .firstName("Пётр")
                        .group("ИДМ-24-01")
                        .educationLevel(EducationLevel.POSTGRADUATE)
                        .admissionYear(2024)
                        .build())
                .build();
    }

    private PublicationRequestDto publicationRequest() {
        return PublicationRequestDto.builder()
                .name("Публикация из матрицы")
                .authors(java.util.List.of("Тестов Т.Т."))
                .description("Описание")
                .source("Сборник")
                .year(2025)
                .build();
    }

    private UserEventRequestDto eventRequest() {
        return UserEventRequestDto.builder()
                .name("Событие из матрицы")
                .startedAt(OffsetDateTime.parse("2026-09-01T10:00:00+03:00"))
                .endedAt(OffsetDateTime.parse("2026-09-01T11:00:00+03:00"))
                .allDay(false)
                .color("#3F51B5")
                .status(EventStatus.NOT_STARTED)
                .notificationFrequency(NotificationFrequency.NONE)
                .build();
    }

    private TagRequestDto tagRequest() {
        return TagRequestDto.builder().name("Тег из матрицы").build();
    }

    private EditablePageRequestDto pageRequest() {
        return EditablePageRequestDto.builder()
                .title(PAGE_TITLE)
                .text("")
                .build();
    }

    private TeacherRequestDto teacherRequest() {
        return TeacherRequestDto.builder()
                .lastName("Матрицын")
                .firstName("Тест")
                .position("доцент")
                .build();
    }

    private SubjectRequestDto subjectRequest() {
        return SubjectRequestDto.builder()
                .name("Матричная дисциплина")
                .build();
    }

    private HelpersEmployeeRequestDto helperRequest() {
        return HelpersEmployeeRequestDto.builder()
                .lastName("Матрицына")
                .firstName("Тест")
                .position("инженер")
                .build();
    }

    private static byte[] jpeg() {
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            ImageIO.write(new BufferedImage(20, 20, BufferedImage.TYPE_INT_RGB), "jpeg", out);

            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private void assertProblem(ResponseEntity<String> response, HttpStatus expected, String detail) {
        assertThat(response.getStatusCode()).isEqualTo(expected);
        assertThat(response.getHeaders().getContentType())
                .as("отказ отдаётся телом ProblemDetail по RFC 9457")
                .isNotNull()
                .satisfies(type -> assertThat(type.toString())
                        .startsWith(MediaType.APPLICATION_PROBLEM_JSON_VALUE));
        assertThat(response.getBody()).contains(detail);
    }

    private static Endpoint controller(HttpMethod method, String path, Set<Actor> allowed) {
        return new Endpoint(method, path, allowed, Source.CONTROLLER);
    }

    private static Endpoint infrastructure(HttpMethod method, String path, Set<Actor> allowed) {
        return new Endpoint(method, path, allowed, Source.INFRASTRUCTURE);
    }
}
