package ru.stankin.uits.module.pages;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import ru.stankin.uits.AbstractIntegrationTest;
import ru.stankin.uits.TestRole;
import ru.stankin.uits.common.PageResponseDto;
import ru.stankin.uits.module.pages.dto.EditablePageRequestDto;
import ru.stankin.uits.module.pages.dto.EditablePageResponseDto;
import ru.stankin.uits.module.pages.entity.EditablePage;
import ru.stankin.uits.module.pages.repository.EditablePageRepository;

import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

public class EditablePageIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private EditablePageRepository editablePageRepository;

    private static final List<String> SEEDED_SLUGS = List.of(
            "fields-of-study",
            "contacts",
            "documents-department",
            "documents-university",
            "bachelor-edu-plans",
            "bachelor-graduate",
            "bachelor-practices",
            "master-edu-plans",
            "master-graduate",
            "master-practices",
            "scientific-activity-postgraduate",
            "home-before",
            "home-after");

    private static final String WRITABLE_SLUG = "home-after";
    private static final String WRITABLE_TITLE = "Главная: блок под новостями";

    @Test
    void seed_CreatesEveryDeclaredSection() {
        List<String> slugs = editablePageRepository.findAll().stream()
                .map(EditablePage::getSlug)
                .toList();

        assertThat(slugs).containsExactlyInAnyOrderElementsOf(SEEDED_SLUGS);
    }

    @Test
    void seed_FillsTitleAndLeavesTextEmpty() {
        EditablePage contacts = editablePageRepository.findBySlug("contacts").orElseThrow();

        assertThat(contacts.getTitle()).isEqualTo("Контакты");
        assertThat(contacts.getText()).isEmpty();
        assertThat(contacts.getCreatedAt()).isNotNull();
        assertThat(contacts.getUpdatedAt()).isNotNull();
    }

    @Test
    void getBySlug_WhenAnonymous_ReturnsSection() {
        ResponseEntity<EditablePageResponseDto> response = restTemplate.getForEntity(
                "/api/public/pages/contacts", EditablePageResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);

        EditablePageResponseDto body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.getSlug()).isEqualTo("contacts");
        assertThat(body.getTitle()).isEqualTo("Контакты");
        assertThat(body.getText()).isEmpty();
        assertThat(body.getCreatedAt()).isNotNull();
        assertThat(body.getUpdatedAt()).isNotNull();
    }

    @Test
    void getBySlug_WhenUnknownSlug_ReturnsNotFound() {
        ResponseEntity<ProblemDetail> response = restTemplate.getForEntity(
                "/api/public/pages/no-such-section", ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getHeaders().getContentType()).isNotNull();
        assertThat(response.getHeaders().getContentType().toString())
                .startsWith(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getDetail()).isEqualTo("Ресурс не найден.");
        assertThat(response.getBody().getInstance()).isNotNull();
    }

    @Test
    void getAll_WhenModerator_ReturnsEverySectionInSeedOrder() {
        createUser("moderator", TestRole.MODERATOR);
        String token = login("moderator");

        ResponseEntity<PageResponseDto<EditablePageResponseDto>> response = restTemplate.exchange(
                "/api/pages", HttpMethod.GET, withToken(token), new ParameterizedTypeReference<>() {});

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);

        PageResponseDto<EditablePageResponseDto> body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.page()).isZero();
        assertThat(body.totalElements()).isEqualTo(SEEDED_SLUGS.size());
        assertThat(body.content().stream().map(EditablePageResponseDto::getSlug))
                .containsExactlyElementsOf(SEEDED_SLUGS);
    }

    @Test
    void update_WhenModerator_ReplacesTitleAndTextAndMovesUpdatedAt() {
        createUser("moderator", TestRole.MODERATOR);
        String token = login("moderator");
        EditablePage before = editablePageRepository.findBySlug(WRITABLE_SLUG).orElseThrow();

        EditablePageRequestDto request = EditablePageRequestDto.builder()
                .title("Блок под новостями")
                .text("## Контакты приёмной\n\nтелефон: 000")
                .build();

        ResponseEntity<EditablePageResponseDto> response = restTemplate.exchange(
                "/api/pages/" + WRITABLE_SLUG, HttpMethod.PUT,
                withToken(request, token), EditablePageResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);

        EditablePageResponseDto body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.getSlug()).isEqualTo(WRITABLE_SLUG);
        assertThat(body.getTitle()).isEqualTo("Блок под новостями");
        assertThat(body.getText()).isEqualTo("## Контакты приёмной\n\nтелефон: 000");

        EditablePage after = editablePageRepository.findBySlug(WRITABLE_SLUG).orElseThrow();
        assertThat(after.getTitle()).isEqualTo("Блок под новостями");
        assertThat(after.getId()).isEqualTo(before.getId());
        assertThat(after.getCreatedAt()).isEqualTo(before.getCreatedAt());
        assertThat(after.getUpdatedAt()).isAfter(before.getUpdatedAt());

        assertThat(body.getUpdatedAt()).isAfter(before.getUpdatedAt());
        assertThat(body.getUpdatedAt()).isCloseTo(after.getUpdatedAt(), within(1, ChronoUnit.MILLIS));
    }

    @Test
    void update_AcceptsEmptyText() {
        String token = moderatorToken();

        ResponseEntity<EditablePageResponseDto> response = restTemplate.exchange(
                "/api/pages/" + WRITABLE_SLUG, HttpMethod.PUT,
                withToken(request(WRITABLE_TITLE, ""), token),
                EditablePageResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getText()).isEmpty();
    }

    @Test
    void update_WhenUnknownSlug_ReturnsNotFoundAndCreatesNothing() {
        String token = moderatorToken();

        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/pages/no-such-section", HttpMethod.PUT,
                withToken(request(WRITABLE_TITLE, "текст"), token), ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(editablePageRepository.findBySlug("no-such-section")).isEmpty();
        assertThat(editablePageRepository.count()).isEqualTo(SEEDED_SLUGS.size());
    }

    @Test
    void update_WhenTitleBlank_ReturnsValidationError() {
        String token = moderatorToken();

        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/pages/" + WRITABLE_SLUG, HttpMethod.PUT,
                withToken(request(" ", "текст"), token),
                ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(fieldErrors(response)).containsKey("title");
    }

    @Test
    void update_WhenTextMissing_ReturnsValidationError() {
        String token = moderatorToken();

        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/pages/" + WRITABLE_SLUG, HttpMethod.PUT,
                withToken(request(WRITABLE_TITLE, null), token),
                ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(fieldErrors(response)).containsKey("text");
    }

    @AfterEach
    void restoreWritableSection() {
        editablePageRepository.findBySlug(WRITABLE_SLUG).ifPresent(section -> {
            section.setTitle(WRITABLE_TITLE);
            section.setText("");
            editablePageRepository.save(section);
        });
    }

    private String moderatorToken() {
        createUser("moderator", TestRole.MODERATOR);

        return login("moderator");
    }

    private EditablePageRequestDto request(String title, String text) {
        return EditablePageRequestDto.builder()
                .title(title)
                .text(text)
                .build();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> fieldErrors(ResponseEntity<ProblemDetail> response) {
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getProperties()).isNotNull();

        return (Map<String, Object>) response.getBody().getProperties().get("errors");
    }

    private <T> HttpEntity<T> withToken(T body, String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);

        return new HttpEntity<>(body, headers);
    }

    private HttpEntity<Void> withToken(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);

        return new HttpEntity<>(headers);
    }
}
