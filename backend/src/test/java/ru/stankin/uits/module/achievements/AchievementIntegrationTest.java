package ru.stankin.uits.module.achievements;

import jakarta.persistence.EntityManagerFactory;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import ru.stankin.uits.AbstractIntegrationTest;
import ru.stankin.uits.TestRole;
import ru.stankin.uits.common.PageResponseDto;
import ru.stankin.uits.module.achievements.dto.AchievementRequestDto;
import ru.stankin.uits.module.achievements.dto.AchievementResponseDto;
import ru.stankin.uits.module.achievements.entity.Achievement;
import ru.stankin.uits.module.achievements.repository.AchievementRepository;
import ru.stankin.uits.module.staff.entity.Teacher;
import ru.stankin.uits.module.staff.repository.TeacherRepository;

import java.io.IOException;
import java.net.URI;
import java.time.OffsetDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Достижения кафедры (T-29): чтение, запись, привязка к преподавателю
 * и санитизация rich-text. Уборка файлов обложки живёт отдельно
 * в {@code AchievementPreviewImageIntegrationTest}.
 */
public class AchievementIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private AchievementRepository achievementRepository;

    @Autowired
    private TeacherRepository teacherRepository;

    @Autowired
    private EntityManagerFactory entityManagerFactory;

    private static final long MISSING_ID = 999_999L;

    // ---------- чтение ----------

    @Test
    void getPublicList_ReturnsOnlyVisible_NewestFirst() throws IOException {
        save("Старое достижение", true, OffsetDateTime.now().minusDays(2), null);
        save("Свежее достижение", true, OffsetDateTime.now(), null);
        save("Черновик", false, OffsetDateTime.now().minusDays(1), null);

        ResponseEntity<PageResponseDto<AchievementResponseDto>> response = restTemplate.exchange(
                "/api/public/achievements", HttpMethod.GET, null, new ParameterizedTypeReference<>() {});

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        PageResponseDto<AchievementResponseDto> body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.totalElements()).isEqualTo(2);
        assertThat(body.content()).extracting(AchievementResponseDto::getTitle)
                .containsExactly("Свежее достижение", "Старое достижение");
    }

    /** Скрытое достижение неотличимо от несуществующего: 403 выдал бы факт наличия черновика. */
    @Test
    void getPublicById_WhenHidden_Returns404() throws IOException {
        Achievement hidden = save("Черновик", false, OffsetDateTime.now(), null);

        ResponseEntity<ProblemDetail> response = restTemplate.getForEntity(
                "/api/public/achievements/" + hidden.getId(), ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void getPublicById_WhenUnknownId_Returns404() {
        ResponseEntity<ProblemDetail> response = restTemplate.getForEntity(
                "/api/public/achievements/" + MISSING_ID, ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void getAdminList_IncludesHidden() throws IOException {
        save("Видимое", true, OffsetDateTime.now(), null);
        save("Черновик", false, OffsetDateTime.now().minusDays(1), null);
        String token = moderatorToken();

        ResponseEntity<PageResponseDto<AchievementResponseDto>> response = restTemplate.exchange(
                "/api/achievements", HttpMethod.GET, withToken(token), new ParameterizedTypeReference<>() {});

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().totalElements()).isEqualTo(2);
    }

    @Test
    void getAdminById_WhenHidden_ReturnsIt() throws IOException {
        Achievement hidden = save("Черновик", false, OffsetDateTime.now(), null);
        String token = moderatorToken();

        ResponseEntity<AchievementResponseDto> response = restTemplate.exchange(
                "/api/achievements/" + hidden.getId(), HttpMethod.GET, withToken(token),
                AchievementResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getDisplay()).isFalse();
    }

    /**
     * Ленивая связь на списке даёт запрос на строку, и заметно это только по счётчику:
     * ответ выглядит одинаково с EntityGraph и без него.
     */
    @Test
    void getPublicList_LoadsTeachersWithoutQueryPerRow() throws IOException {
        save("Первое", true, OffsetDateTime.now().minusDays(3), saveTeacher("Иванова", "Мария"));
        save("Второе", true, OffsetDateTime.now().minusDays(2), saveTeacher("Петров", "Сергей"));
        save("Третье", true, OffsetDateTime.now().minusDays(1), saveTeacher("Сидоров", "Олег"));

        Statistics statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
        statistics.setStatisticsEnabled(true);
        statistics.clear();

        ResponseEntity<PageResponseDto<AchievementResponseDto>> response;
        long queries;

        try {
            response = restTemplate.exchange(
                    "/api/public/achievements", HttpMethod.GET, null, new ParameterizedTypeReference<>() {});
            queries = statistics.getPrepareStatementCount();
        } finally {
            statistics.setStatisticsEnabled(false);
        }

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().content()).extracting(AchievementResponseDto::getTeacherName)
                .containsExactly("Сидоров Олег", "Петров Сергей", "Иванова Мария");
        assertThat(queries)
                .as("выборка страницы и опциональный count; запрос за каждым преподавателем — это N+1")
                .isLessThanOrEqualTo(2);
    }

    @Test
    void getTeacherAchievements_ReturnsOnlyHisPublished() throws IOException {
        Teacher teacher = saveTeacher("Иванова", "Мария");
        Teacher another = saveTeacher("Петров", "Сергей");
        save("Его достижение", true, OffsetDateTime.now(), teacher);
        save("Его черновик", false, OffsetDateTime.now(), teacher);
        save("Чужое достижение", true, OffsetDateTime.now(), another);
        save("Достижение кафедры", true, OffsetDateTime.now(), null);

        ResponseEntity<PageResponseDto<AchievementResponseDto>> response = restTemplate.exchange(
                "/api/public/teachers/" + teacher.getId() + "/achievements", HttpMethod.GET, null,
                new ParameterizedTypeReference<>() {});

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().content()).extracting(AchievementResponseDto::getTitle)
                .containsExactly("Его достижение");
    }

    /** Паритет со старым порталом: список фильтруется по teacher_id, карточка не проверяется. */
    @Test
    void getTeacherAchievements_WhenUnknownTeacher_ReturnsEmptyPage() {
        ResponseEntity<PageResponseDto<AchievementResponseDto>> response = restTemplate.exchange(
                "/api/public/teachers/" + MISSING_ID + "/achievements", HttpMethod.GET, null,
                new ParameterizedTypeReference<>() {});

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().totalElements()).isZero();
    }

    @Test
    void getPublicList_WhenSortFieldIsUnknown_Returns400() {
        ResponseEntity<ProblemDetail> response = restTemplate.getForEntity(
                "/api/public/achievements?sort=abc", ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getDetail()).contains("abc");
    }

    // ---------- создание ----------

    @Test
    void create_WhenModerator_Returns201WithLocationAndBody() throws IOException {
        String token = moderatorToken();

        ResponseEntity<AchievementResponseDto> response = restTemplate.postForEntity(
                "/api/achievements", withToken(validRequest().build(), token), AchievementResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        AchievementResponseDto body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.getId()).isNotNull();
        assertThat(body.getTitle()).isEqualTo("Достижение");
        assertThat(body.getCreatedAt()).isNotNull();
        assertThat(body.getTeacherId()).isNull();
        assertThat(body.getTeacherName()).isNull();

        URI location = response.getHeaders().getLocation();
        assertThat(location).isNotNull();
        assertThat(location.getPath()).isEqualTo("/api/achievements/" + body.getId());
        assertThat(achievementRepository.findAll()).hasSize(1);
    }

    @Test
    void create_WhenTitleMissing_Returns400() throws IOException {
        String token = moderatorToken();

        ResponseEntity<String> response = restTemplate.postForEntity(
                "/api/achievements", withToken(validRequest().title(null).build(), token), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).contains("title");
        assertThat(achievementRepository.findAll()).isEmpty();
    }

    /** В старом портале все три поля обязательны на уровне модели — паритет сохраняется. */
    @Test
    void create_WhenRequiredTextMissing_Returns400() throws IOException {
        String token = moderatorToken();
        AchievementRequestDto request = validRequest()
                .description(null)
                .content(null)
                .previewImage(null)
                .build();

        ResponseEntity<String> response = restTemplate.postForEntity(
                "/api/achievements", withToken(request, token), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).contains("description", "content", "previewImage");
        assertThat(achievementRepository.findAll()).isEmpty();
    }

    /** Тело без display дало бы молча скрытое достижение, а не ошибку. */
    @Test
    void create_WhenDisplayMissing_Returns400() throws IOException {
        String token = moderatorToken();

        ResponseEntity<String> response = restTemplate.postForEntity(
                "/api/achievements", withToken(validRequest().display(null).build(), token), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).contains("display");
    }

    /** Колонка — VARCHAR(100) как в Django: без проверки длины запись упала бы 500 в базе. */
    @Test
    void create_WhenTitleTooLong_Returns400() throws IOException {
        String token = moderatorToken();
        AchievementRequestDto request = validRequest().title("а".repeat(101)).build();

        ResponseEntity<String> response = restTemplate.postForEntity(
                "/api/achievements", withToken(request, token), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).contains("title");
    }

    // ---------- привязка к преподавателю ----------

    @Test
    void create_WithTeacher_LinksItAndReturnsFullName() throws IOException {
        Teacher teacher = saveTeacher("Иванова", "Мария", "Петровна");
        String token = moderatorToken();
        AchievementRequestDto request = validRequest().teacherId(teacher.getId()).build();

        ResponseEntity<AchievementResponseDto> response = restTemplate.postForEntity(
                "/api/achievements", withToken(request, token), AchievementResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getTeacherId()).isEqualTo(teacher.getId());
        assertThat(response.getBody().getTeacherName()).isEqualTo("Иванова Мария Петровна");
        assertThat(achievementRepository.findAll().getFirst().getTeacher().getId()).isEqualTo(teacher.getId());
    }

    @Test
    void create_WhenTeacherUnknown_Returns400() throws IOException {
        String token = moderatorToken();
        AchievementRequestDto request = validRequest().teacherId(MISSING_ID).build();

        ResponseEntity<ProblemDetail> response = restTemplate.postForEntity(
                "/api/achievements", withToken(request, token), ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getDetail()).contains(String.valueOf(MISSING_ID));
        assertThat(achievementRepository.findAll()).isEmpty();
    }

    /** Ссылка проверяется до записи: неизвестный преподаватель не должен оставлять правку наполовину. */
    @Test
    void update_WhenTeacherUnknown_Returns400AndKeepsAchievement() throws IOException {
        Achievement saved = save("Было", true, OffsetDateTime.now(), null);
        String token = moderatorToken();
        AchievementRequestDto request = validRequest()
                .title("Стало")
                .teacherId(MISSING_ID)
                .build();

        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/achievements/" + saved.getId(), HttpMethod.PUT,
                withToken(request, token), ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(achievementRepository.findById(saved.getId()).orElseThrow().getTitle()).isEqualTo("Было");
    }

    /**
     * Преподаватель уходит с кафедры, достижение кафедры остаётся: FK объявлен
     * ON DELETE SET NULL, иначе удаление карточки упиралось бы в ссылку.
     */
    @Test
    void deleteTeacher_KeepsAchievementAndClearsLink() throws IOException {
        Teacher teacher = saveTeacher("Иванова", "Мария");
        Achievement achievement = save("Достижение", true, OffsetDateTime.now(), teacher);
        String token = moderatorToken();

        ResponseEntity<Void> response = restTemplate.exchange(
                "/api/teachers/" + teacher.getId(), HttpMethod.DELETE, withToken(token), Void.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        Achievement stored = achievementRepository.findById(achievement.getId()).orElseThrow();
        assertThat(stored.getTeacher()).isNull();
    }

    // ---------- санитизация ----------

    @Test
    void create_StripsScriptFromContent() throws IOException {
        String token = moderatorToken();
        AchievementRequestDto request = validRequest()
                .content("<p>Награда кафедры</p><script>alert(1)</script>")
                .build();

        ResponseEntity<AchievementResponseDto> response = restTemplate.postForEntity(
                "/api/achievements", withToken(request, token), AchievementResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        String stored = achievementRepository.findAll().getFirst().getContent();
        assertThat(stored).contains("Награда кафедры");
        assertThat(stored).doesNotContain("script");
    }

    /**
     * Вторая дверь записи: update пишет dirty checking'ом, без вызова save(),
     * и ориентир «перед сохранением» там не за что зацепить (урок T-21).
     */
    @Test
    void update_StripsScriptFromContent() throws IOException {
        Achievement saved = save("Достижение", true, OffsetDateTime.now(), null);
        String token = moderatorToken();
        AchievementRequestDto request = validRequest()
                .content("<p>Обновлено</p><img src=x onerror=alert(1)>")
                .build();

        ResponseEntity<AchievementResponseDto> response = restTemplate.exchange(
                "/api/achievements/" + saved.getId(), HttpMethod.PUT,
                withToken(request, token), AchievementResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        String stored = achievementRepository.findById(saved.getId()).orElseThrow().getContent();
        assertThat(stored).contains("Обновлено");
        assertThat(stored).doesNotContain("onerror");
    }

    /**
     * Содержание обязательно, а @NotBlank отрабатывает до чистки: без проверки
     * после jsoup запись из одного {@code <script>} прошла бы с пустым телом
     * (дефект новостей из T-35).
     */
    @Test
    void create_WhenContentIsOnlyForbiddenMarkup_Returns400() throws IOException {
        String token = moderatorToken();
        AchievementRequestDto request = validRequest()
                .content("<iframe src=\"https://example.com/video\"></iframe>")
                .build();

        ResponseEntity<ProblemDetail> response = restTemplate.postForEntity(
                "/api/achievements", withToken(request, token), ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(achievementRepository.findAll()).isEmpty();
    }

    // ---------- правка и удаление ----------

    @Test
    void update_ReplacesAllFieldsAndUnlinksTeacher() throws IOException {
        Teacher teacher = saveTeacher("Иванова", "Мария");
        Achievement saved = save("Было", true, OffsetDateTime.now(), teacher);
        String token = moderatorToken();
        AchievementRequestDto request = validRequest()
                .title("Стало")
                .description("Новое описание")
                .display(false)
                .previewImage(saved.getPreviewImage())
                .build();

        ResponseEntity<AchievementResponseDto> response = restTemplate.exchange(
                "/api/achievements/" + saved.getId(), HttpMethod.PUT,
                withToken(request, token), AchievementResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getTeacherId()).isNull();
        Achievement stored = achievementRepository.findById(saved.getId()).orElseThrow();
        assertThat(stored.getTitle()).isEqualTo("Стало");
        assertThat(stored.getDescription()).isEqualTo("Новое описание");
        assertThat(stored.isDisplay()).isFalse();
        assertThat(stored.getTeacher()).isNull();
    }

    @Test
    void update_WhenUnknownId_Returns404() throws IOException {
        String token = moderatorToken();

        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/achievements/" + MISSING_ID, HttpMethod.PUT,
                withToken(validRequest().build(), token), ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void delete_Returns204AndDisappears() throws IOException {
        Achievement saved = save("Достижение", true, OffsetDateTime.now(), null);
        String token = moderatorToken();

        ResponseEntity<Void> response = restTemplate.exchange(
                "/api/achievements/" + saved.getId(), HttpMethod.DELETE, withToken(token), Void.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(achievementRepository.findById(saved.getId())).isEmpty();
    }

    @Test
    void delete_WhenUnknownId_Returns404() {
        String token = moderatorToken();

        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/achievements/" + MISSING_ID, HttpMethod.DELETE, withToken(token), ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    // ---------- фикстуры ----------

    private Achievement save(String title, boolean display, OffsetDateTime createdAt, Teacher teacher)
            throws IOException {
        return achievementRepository.save(Achievement.builder()
                .title(title)
                .description("Краткое описание")
                .content("<p>Содержание</p>")
                .previewImage(storeFile("achievements"))
                .display(display)
                .createdAt(createdAt)
                .teacher(teacher)
                .build());
    }

    private Teacher saveTeacher(String lastName, String firstName) {
        return saveTeacher(lastName, firstName, null);
    }

    private Teacher saveTeacher(String lastName, String firstName, String patronymic) {
        return teacherRepository.save(Teacher.builder()
                .lastName(lastName)
                .firstName(firstName)
                .patronymic(patronymic)
                .position("доцент")
                .build());
    }

    private AchievementRequestDto.AchievementRequestDtoBuilder validRequest() throws IOException {
        return AchievementRequestDto.builder()
                .title("Достижение")
                .description("Краткое описание")
                .content("<p>Содержание</p>")
                .previewImage(storeFile("achievements"))
                .display(true);
    }

    private String moderatorToken() {
        createUser("moder", TestRole.MODERATOR);

        return login("moder");
    }

    private <T> HttpEntity<T> withToken(T body, String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);

        return new HttpEntity<>(body, headers);
    }

    private HttpEntity<Void> withToken(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);

        return new HttpEntity<>(headers);
    }
}
