package ru.stankin.uits.module.news;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import ru.stankin.uits.AbstractIntegrationTest;
import ru.stankin.uits.TestRole;
import ru.stankin.uits.module.news.dto.ConferenceRequestDto;
import ru.stankin.uits.module.news.dto.ConferenceResponseDto;
import ru.stankin.uits.module.news.entity.ConferenceAnnouncement;
import ru.stankin.uits.module.news.repository.ConferenceRepository;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.OffsetDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Обложка объявления о конференции: проверка ключа, адрес картинки в ответе
 * и уборка файла, переставшего быть обложкой. Правила те же, что у новости (T-23),
 * поэтому и набор проверок тот же.
 *
 * <p>Фикстуры кладутся на диск напрямую: ручка загрузки проверяется отдельно
 * в {@code FileUploadIntegrationTest}, здесь она была бы лишним звеном.
 */
public class ConferencePreviewImageIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private ConferenceRepository conferenceRepository;

    @Test
    void create_WhenCoverMissingInStorage_Returns400() {
        String token = moderatorToken();

        ResponseEntity<ProblemDetail> response = restTemplate.postForEntity(
                "/api/conferences",
                withToken(requestWithCover("news/2026/08/never-uploaded.jpg"), token),
                ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getDetail()).contains("never-uploaded.jpg");
        assertThat(conferenceRepository.findAll()).isEmpty();
    }

    /** Ключ существующего файла из чужого раздела: обложка конференции живёт в news (D-13). */
    @Test
    void create_WhenCoverFromOtherCategory_Returns400() throws IOException {
        String token = moderatorToken();
        String avatarKey = storeFile("avatars");

        ResponseEntity<ProblemDetail> response = restTemplate.postForEntity(
                "/api/conferences",
                withToken(requestWithCover(avatarKey), token),
                ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(conferenceRepository.findAll()).isEmpty();
        assertThat(STORAGE_ROOT.resolve(avatarKey)).exists();
    }

    /** Вторая дверь записи: закрытая одна оставила бы вторую открытой (урок T-23). */
    @Test
    void update_WhenCoverMissingInStorage_Returns400AndKeepsOldCover() throws IOException {
        String key = storeFile();
        ConferenceAnnouncement saved = saveWithCover(key);
        String token = moderatorToken();

        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/conferences/" + saved.getId(), HttpMethod.PUT,
                withToken(requestWithCover("news/2026/08/never-uploaded.jpg"), token),
                ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(conferenceRepository.findById(saved.getId()).orElseThrow().getPreviewImage()).isEqualTo(key);
        assertThat(STORAGE_ROOT.resolve(key)).exists();
    }

    @Test
    void create_WhenCoverPresent_ReturnsKeyAndUrl() throws IOException {
        String key = storeFile();
        String token = moderatorToken();

        ResponseEntity<ConferenceResponseDto> response = restTemplate.postForEntity(
                "/api/conferences", withToken(requestWithCover(key), token), ConferenceResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        ConferenceResponseDto body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.getPreviewImage()).isEqualTo(key);
        assertThat(body.getPreviewImageUrl()).isEqualTo("/media/" + key);
    }

    @Test
    void update_WhenCoverReplaced_DeletesOldFile() throws IOException {
        String oldKey = storeFile();
        String newKey = storeFile();
        ConferenceAnnouncement saved = saveWithCover(oldKey);
        String token = moderatorToken();

        ResponseEntity<ConferenceResponseDto> response = restTemplate.exchange(
                "/api/conferences/" + saved.getId(), HttpMethod.PUT,
                withToken(requestWithCover(newKey), token), ConferenceResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(STORAGE_ROOT.resolve(oldKey)).doesNotExist();
        assertThat(STORAGE_ROOT.resolve(newKey)).exists();
    }

    @Test
    void update_WhenCoverRemoved_DeletesOldFile() throws IOException {
        String key = storeFile();
        ConferenceAnnouncement saved = saveWithCover(key);
        String token = moderatorToken();

        ResponseEntity<ConferenceResponseDto> response = restTemplate.exchange(
                "/api/conferences/" + saved.getId(), HttpMethod.PUT,
                withToken(requestWithoutCover(), token), ConferenceResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getPreviewImage()).isNull();
        assertThat(STORAGE_ROOT.resolve(key)).doesNotExist();
    }

    /**
     * PUT — полная замена, и форма присылает тот же ключ при правке одного заголовка.
     * Удаление «того, что было до правки» без сравнения ключей стёрло бы живую картинку.
     */
    @Test
    void update_WhenCoverUnchanged_KeepsFile() throws IOException {
        String key = storeFile();
        ConferenceAnnouncement saved = saveWithCover(key);
        String token = moderatorToken();

        ResponseEntity<ConferenceResponseDto> response = restTemplate.exchange(
                "/api/conferences/" + saved.getId(), HttpMethod.PUT,
                withToken(requestWithCover(key), token), ConferenceResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(STORAGE_ROOT.resolve(key)).exists();
    }

    @Test
    void delete_WhenCoverPresent_DeletesFile() throws IOException {
        String key = storeFile();
        ConferenceAnnouncement saved = saveWithCover(key);
        String token = moderatorToken();

        ResponseEntity<Void> response = restTemplate.exchange(
                "/api/conferences/" + saved.getId(), HttpMethod.DELETE, withToken(token), Void.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(STORAGE_ROOT.resolve(key)).doesNotExist();
    }

    // ---------- фикстуры ----------

    private String storeFile() throws IOException {
        String key = "news/2026/08/" + UUID.randomUUID() + ".jpg";
        Path target = STORAGE_ROOT.resolve(key);
        Files.createDirectories(target.getParent());
        Files.writeString(target, "содержимое картинки");

        return key;
    }

    private ConferenceAnnouncement saveWithCover(String key) {
        return conferenceRepository.save(ConferenceAnnouncement.builder()
                .title("Конференция")
                .display(true)
                .previewImage(key)
                .createdAt(OffsetDateTime.now())
                .build());
    }

    private ConferenceRequestDto requestWithCover(String key) {
        return ConferenceRequestDto.builder()
                .title("Конференция")
                .display(true)
                .previewImage(key)
                .previewImageDescription("Афиша конференции")
                .build();
    }

    private ConferenceRequestDto requestWithoutCover() {
        return ConferenceRequestDto.builder()
                .title("Конференция")
                .display(true)
                .build();
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
