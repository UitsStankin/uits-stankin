package ru.stankin.uits.module.news;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import ru.stankin.uits.AbstractIntegrationTest;
import ru.stankin.uits.TestRole;
import ru.stankin.uits.common.PageResponseDto;
import ru.stankin.uits.module.news.dto.ConferenceRequestDto;
import ru.stankin.uits.module.news.dto.ConferenceResponseDto;
import ru.stankin.uits.module.news.entity.ConferenceAnnouncement;
import ru.stankin.uits.module.news.repository.ConferenceRepository;

import java.net.URI;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Объявления о конференциях (T-28): чтение, запись, нормализация дат и времени,
 * санитизация rich-text. Уборка файлов обложки живёт отдельно
 * в {@code ConferencePreviewImageIntegrationTest}.
 */
public class ConferenceIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private ConferenceRepository conferenceRepository;

    private static final long MISSING_ID = 999_999L;

    // ---------- чтение ----------

    @Test
    void getPublicList_ReturnsOnlyVisible_NewestFirst() {
        save("Старая конференция", true, OffsetDateTime.now().minusDays(2));
        save("Свежая конференция", true, OffsetDateTime.now());
        save("Черновик", false, OffsetDateTime.now().minusDays(1));

        ResponseEntity<PageResponseDto<ConferenceResponseDto>> response = restTemplate.exchange(
                "/api/public/conferences", HttpMethod.GET, null, new ParameterizedTypeReference<>() {});

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        PageResponseDto<ConferenceResponseDto> body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.totalElements()).isEqualTo(2);
        assertThat(body.content()).extracting(ConferenceResponseDto::getTitle)
                .containsExactly("Свежая конференция", "Старая конференция");
    }

    /** Скрытое объявление неотличимо от несуществующего: 403 выдал бы факт наличия черновика. */
    @Test
    void getPublicById_WhenHidden_Returns404() {
        ConferenceAnnouncement hidden = save("Черновик", false, OffsetDateTime.now());

        ResponseEntity<ProblemDetail> response = restTemplate.getForEntity(
                "/api/public/conferences/" + hidden.getId(), ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void getPublicById_WhenUnknownId_Returns404() {
        ResponseEntity<ProblemDetail> response = restTemplate.getForEntity(
                "/api/public/conferences/" + MISSING_ID, ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void getAdminList_IncludesHidden() {
        save("Видимая", true, OffsetDateTime.now());
        save("Черновик", false, OffsetDateTime.now().minusDays(1));
        String token = moderatorToken();

        ResponseEntity<PageResponseDto<ConferenceResponseDto>> response = restTemplate.exchange(
                "/api/conferences", HttpMethod.GET, withToken(token), new ParameterizedTypeReference<>() {});

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().totalElements()).isEqualTo(2);
    }

    @Test
    void getAdminById_WhenHidden_ReturnsIt() {
        ConferenceAnnouncement hidden = save("Черновик", false, OffsetDateTime.now());
        String token = moderatorToken();

        ResponseEntity<ConferenceResponseDto> response = restTemplate.exchange(
                "/api/conferences/" + hidden.getId(), HttpMethod.GET, withToken(token), ConferenceResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getDisplay()).isFalse();
    }

    @Test
    void getPublicList_WhenSortFieldIsUnknown_Returns400() {
        ResponseEntity<ProblemDetail> response = restTemplate.getForEntity(
                "/api/public/conferences?sort=abc", ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getDetail()).contains("abc");
    }

    // ---------- создание ----------

    @Test
    void create_WhenModerator_Returns201WithLocationAndBody() {
        String token = moderatorToken();

        ResponseEntity<ConferenceResponseDto> response = restTemplate.postForEntity(
                "/api/conferences", withToken(validRequest().build(), token), ConferenceResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        ConferenceResponseDto body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.getId()).isNotNull();
        assertThat(body.getTitle()).isEqualTo("Конференция");
        assertThat(body.getCreatedAt()).isNotNull();

        URI location = response.getHeaders().getLocation();
        assertThat(location).isNotNull();
        assertThat(location.getPath()).isEqualTo("/api/conferences/" + body.getId());
        assertThat(conferenceRepository.findAll()).hasSize(1);
    }

    @Test
    void create_WhenTitleMissing_Returns400() {
        String token = moderatorToken();
        ConferenceRequestDto request = validRequest().title(null).build();

        ResponseEntity<String> response = restTemplate.postForEntity(
                "/api/conferences", withToken(request, token), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).contains("title");
        assertThat(conferenceRepository.findAll()).isEmpty();
    }

    /** Тело без display дало бы молча скрытое объявление, а не ошибку. */
    @Test
    void create_WhenDisplayMissing_Returns400() {
        String token = moderatorToken();
        ConferenceRequestDto request = validRequest().display(null).build();

        ResponseEntity<String> response = restTemplate.postForEntity(
                "/api/conferences", withToken(request, token), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).contains("display");
    }

    @Test
    void create_WhenContactEmailIsInvalid_Returns400() {
        String token = moderatorToken();
        ConferenceRequestDto request = validRequest().contactEmail("не-почта").build();

        ResponseEntity<String> response = restTemplate.postForEntity(
                "/api/conferences", withToken(request, token), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).contains("contactEmail");
    }

    // ---------- даты и время ----------

    /**
     * Сообщение обязано лечь в errors под ключом поля: контракт обещает форме,
     * куда вешать ошибку, а обработчик собирает errors только из getFieldErrors().
     */
    @Test
    void create_WhenEndDateBeforeStartDate_Returns400WithFieldError() {
        String token = moderatorToken();
        ConferenceRequestDto request = validRequest()
                .startDate(LocalDate.of(2026, 10, 14))
                .endDate(LocalDate.of(2026, 10, 12))
                .build();

        ResponseEntity<String> response = restTemplate.postForEntity(
                "/api/conferences", withToken(request, token), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).contains("\"endDate\"");
        assertThat(conferenceRepository.findAll()).isEmpty();
    }

    @Test
    void create_WhenEndDateWithoutStartDate_Returns400WithFieldError() {
        String token = moderatorToken();
        ConferenceRequestDto request = validRequest()
                .startDate(null)
                .endDate(LocalDate.of(2026, 10, 16))
                .build();

        ResponseEntity<String> response = restTemplate.postForEntity(
                "/api/conferences", withToken(request, token), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).contains("\"endDate\"");
    }

    @Test
    void create_WhenTimeWithoutStartDate_Returns400WithFieldError() {
        String token = moderatorToken();
        ConferenceRequestDto request = validRequest()
                .startDate(null)
                .endDate(null)
                .time(LocalTime.of(10, 0))
                .build();

        ResponseEntity<String> response = restTemplate.postForEntity(
                "/api/conferences", withToken(request, token), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).contains("\"time\"");
    }

    /** Однодневная конференция имеет одно представление, а не два. */
    @Test
    void create_WhenEndDateEqualsStartDate_NormalizesToNull() {
        String token = moderatorToken();
        LocalDate day = LocalDate.of(2026, 10, 14);
        ConferenceRequestDto request = validRequest().startDate(day).endDate(day).build();

        ResponseEntity<ConferenceResponseDto> response = restTemplate.postForEntity(
                "/api/conferences", withToken(request, token), ConferenceResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getEndDate()).isNull();
        assertThat(conferenceRepository.findAll().getFirst().getEndDate()).isNull();
    }

    /** Контракт обещает HH:mm: секунды не должны ни сохраняться, ни попадать в ответ. */
    @Test
    void create_WhenTimeHasSeconds_TruncatesToMinutesAndRendersHhMm() {
        String token = moderatorToken();
        Map<String, Object> request = new HashMap<>();
        request.put("title", "Конференция");
        request.put("display", true);
        request.put("startDate", "2026-10-14");
        request.put("time", "10:00:45");

        ResponseEntity<String> response = restTemplate.postForEntity(
                "/api/conferences", withToken(request, token), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).contains("\"time\":\"10:00\"");
        assertThat(conferenceRepository.findAll().getFirst().getTime()).isEqualTo(LocalTime.of(10, 0));
    }

    // ---------- санитизация ----------

    @Test
    void create_StripsScriptFromContent() {
        String token = moderatorToken();
        ConferenceRequestDto request = validRequest()
                .content("<p>Приглашаем</p><script>alert(1)</script>")
                .build();

        ResponseEntity<ConferenceResponseDto> response = restTemplate.postForEntity(
                "/api/conferences", withToken(request, token), ConferenceResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        String stored = conferenceRepository.findAll().getFirst().getContent();
        assertThat(stored).contains("Приглашаем");
        assertThat(stored).doesNotContain("script");
    }

    /**
     * Вторая дверь записи: update пишет dirty checking'ом, без вызова save(),
     * и ориентир «перед сохранением» там не за что зацепить (урок T-21).
     */
    @Test
    void update_StripsScriptFromContent() {
        ConferenceAnnouncement saved = save("Конференция", true, OffsetDateTime.now());
        String token = moderatorToken();
        ConferenceRequestDto request = validRequest()
                .content("<p>Обновлено</p><img src=x onerror=alert(1)>")
                .build();

        ResponseEntity<ConferenceResponseDto> response = restTemplate.exchange(
                "/api/conferences/" + saved.getId(), HttpMethod.PUT,
                withToken(request, token), ConferenceResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        String stored = conferenceRepository.findById(saved.getId()).orElseThrow().getContent();
        assertThat(stored).contains("Обновлено");
        assertThat(stored).doesNotContain("onerror");
    }

    /** Тело, вычищенное до пустоты, не должно давать второе представление пустого поля. */
    @Test
    void create_WhenContentIsOnlyForbiddenMarkup_SavesNull() {
        String token = moderatorToken();
        ConferenceRequestDto request = validRequest()
                .content("<iframe src=\"https://example.com/video\"></iframe>")
                .build();

        ResponseEntity<ConferenceResponseDto> response = restTemplate.postForEntity(
                "/api/conferences", withToken(request, token), ConferenceResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getContent()).isNull();
        assertThat(conferenceRepository.findAll().getFirst().getContent()).isNull();
    }

    /** Пустая строка из формы приходит как null ещё в Jackson (T-34). */
    @Test
    void create_WhenOptionalFieldIsBlank_SavesNull() {
        String token = moderatorToken();
        ConferenceRequestDto request = validRequest()
                .organizer("")
                .contactPhone("   ")
                .build();

        ResponseEntity<ConferenceResponseDto> response = restTemplate.postForEntity(
                "/api/conferences", withToken(request, token), ConferenceResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        ConferenceAnnouncement stored = conferenceRepository.findAll().getFirst();
        assertThat(stored.getOrganizer()).isNull();
        assertThat(stored.getContactPhone()).isNull();
    }

    // ---------- правка и удаление ----------

    @Test
    void update_ReplacesAllFields() {
        ConferenceAnnouncement saved = save("Было", true, OffsetDateTime.now());
        saved.setOrganizer("Старый организатор");
        conferenceRepository.save(saved);
        String token = moderatorToken();

        ConferenceRequestDto request = ConferenceRequestDto.builder()
                .title("Стало")
                .display(false)
                .build();

        ResponseEntity<ConferenceResponseDto> response = restTemplate.exchange(
                "/api/conferences/" + saved.getId(), HttpMethod.PUT,
                withToken(request, token), ConferenceResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        ConferenceAnnouncement stored = conferenceRepository.findById(saved.getId()).orElseThrow();
        assertThat(stored.getTitle()).isEqualTo("Стало");
        assertThat(stored.isDisplay()).isFalse();
        assertThat(stored.getOrganizer()).isNull();
    }

    @Test
    void update_WhenUnknownId_Returns404() {
        String token = moderatorToken();

        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/conferences/" + MISSING_ID, HttpMethod.PUT,
                withToken(validRequest().build(), token), ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void delete_Returns204AndDisappears() {
        ConferenceAnnouncement saved = save("Конференция", true, OffsetDateTime.now());
        String token = moderatorToken();

        ResponseEntity<Void> response = restTemplate.exchange(
                "/api/conferences/" + saved.getId(), HttpMethod.DELETE, withToken(token), Void.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(conferenceRepository.findById(saved.getId())).isEmpty();
    }

    @Test
    void delete_WhenUnknownId_Returns404() {
        String token = moderatorToken();

        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/conferences/" + MISSING_ID, HttpMethod.DELETE, withToken(token), ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    // ---------- фикстуры ----------

    private ConferenceAnnouncement save(String title, boolean display, OffsetDateTime createdAt) {
        return conferenceRepository.save(ConferenceAnnouncement.builder()
                .title(title)
                .display(display)
                .createdAt(createdAt)
                .build());
    }

    private ConferenceRequestDto.ConferenceRequestDtoBuilder validRequest() {
        return ConferenceRequestDto.builder()
                .title("Конференция")
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
