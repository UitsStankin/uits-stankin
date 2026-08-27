package ru.stankin.uits.module.achievements;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import ru.stankin.uits.AbstractIntegrationTest;
import ru.stankin.uits.TestRole;
import ru.stankin.uits.module.achievements.dto.AchievementRequestDto;
import ru.stankin.uits.module.achievements.dto.AchievementResponseDto;
import ru.stankin.uits.module.achievements.entity.Achievement;
import ru.stankin.uits.module.achievements.repository.AchievementRepository;

import java.io.IOException;
import java.time.OffsetDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Обложка достижения: проверка ключа, адрес картинки в ответе и уборка файла,
 * переставшего быть обложкой. Правила те же, что у новости (T-23), с одной
 * разницей: обложка обязательна, поэтому снять её правкой нельзя.
 */
public class AchievementPreviewImageIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private AchievementRepository achievementRepository;

    private static final String NEVER_UPLOADED = "achievements/2026/08/never-uploaded.jpg";

    @Test
    void create_WhenCoverMissingInStorage_Returns400() {
        String token = moderatorToken();

        ResponseEntity<ProblemDetail> response = restTemplate.postForEntity(
                "/api/achievements", withToken(requestWithCover(NEVER_UPLOADED), token), ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getDetail()).contains("never-uploaded.jpg");
        assertThat(achievementRepository.findAll()).isEmpty();
    }

    /** Ключ существующего файла из чужого раздела: обложка достижения живёт в achievements (D-13). */
    @Test
    void create_WhenCoverFromOtherCategory_Returns400() throws IOException {
        String token = moderatorToken();
        String avatarKey = storeFile("avatars");

        ResponseEntity<ProblemDetail> response = restTemplate.postForEntity(
                "/api/achievements", withToken(requestWithCover(avatarKey), token), ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(achievementRepository.findAll()).isEmpty();
        assertThat(STORAGE_ROOT.resolve(avatarKey)).exists();
    }

    /** Вторая дверь записи: закрытая одна оставила бы вторую открытой (урок T-23). */
    @Test
    void update_WhenCoverMissingInStorage_Returns400AndKeepsOldCover() throws IOException {
        String key = storeFile("achievements");
        Achievement saved = saveWithCover(key);
        String token = moderatorToken();

        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/achievements/" + saved.getId(), HttpMethod.PUT,
                withToken(requestWithCover(NEVER_UPLOADED), token), ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(achievementRepository.findById(saved.getId()).orElseThrow().getPreviewImage()).isEqualTo(key);
        assertThat(STORAGE_ROOT.resolve(key)).exists();
    }

    @Test
    void create_WhenCoverPresent_ReturnsKeyAndUrl() throws IOException {
        String key = storeFile("achievements");
        String token = moderatorToken();

        ResponseEntity<AchievementResponseDto> response = restTemplate.postForEntity(
                "/api/achievements", withToken(requestWithCover(key), token), AchievementResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        AchievementResponseDto body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.getPreviewImage()).isEqualTo(key);
        assertThat(body.getPreviewImageUrl()).isEqualTo("/media/" + key);
    }

    @Test
    void update_WhenCoverReplaced_DeletesOldFile() throws IOException {
        String oldKey = storeFile("achievements");
        String newKey = storeFile("achievements");
        Achievement saved = saveWithCover(oldKey);
        String token = moderatorToken();

        ResponseEntity<AchievementResponseDto> response = restTemplate.exchange(
                "/api/achievements/" + saved.getId(), HttpMethod.PUT,
                withToken(requestWithCover(newKey), token), AchievementResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(STORAGE_ROOT.resolve(oldKey)).doesNotExist();
        assertThat(STORAGE_ROOT.resolve(newKey)).exists();
    }

    /**
     * PUT — полная замена, и форма присылает тот же ключ при правке одного заголовка.
     * Удаление «того, что было до правки» без сравнения ключей стёрло бы живую картинку.
     */
    @Test
    void update_WhenCoverUnchanged_KeepsFile() throws IOException {
        String key = storeFile("achievements");
        Achievement saved = saveWithCover(key);
        String token = moderatorToken();

        ResponseEntity<AchievementResponseDto> response = restTemplate.exchange(
                "/api/achievements/" + saved.getId(), HttpMethod.PUT,
                withToken(requestWithCover(key), token), AchievementResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(STORAGE_ROOT.resolve(key)).exists();
    }

    /** Обложка обязательна: правка без неё — ошибка, а не снятие картинки. */
    @Test
    void update_WhenCoverOmitted_Returns400AndKeepsFile() throws IOException {
        String key = storeFile("achievements");
        Achievement saved = saveWithCover(key);
        String token = moderatorToken();

        ResponseEntity<String> response = restTemplate.exchange(
                "/api/achievements/" + saved.getId(), HttpMethod.PUT,
                withToken(requestWithoutCover(), token), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).contains("previewImage");
        assertThat(achievementRepository.findById(saved.getId()).orElseThrow().getPreviewImage()).isEqualTo(key);
        assertThat(STORAGE_ROOT.resolve(key)).exists();
    }

    @Test
    void delete_WhenCoverPresent_DeletesFile() throws IOException {
        String key = storeFile("achievements");
        Achievement saved = saveWithCover(key);
        String token = moderatorToken();

        ResponseEntity<Void> response = restTemplate.exchange(
                "/api/achievements/" + saved.getId(), HttpMethod.DELETE, withToken(token), Void.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(STORAGE_ROOT.resolve(key)).doesNotExist();
    }

    // ---------- фикстуры ----------

    private Achievement saveWithCover(String key) {
        return achievementRepository.save(Achievement.builder()
                .title("Достижение")
                .description("Краткое описание")
                .content("<p>Содержание</p>")
                .previewImage(key)
                .display(true)
                .createdAt(OffsetDateTime.now())
                .build());
    }

    private AchievementRequestDto requestWithCover(String key) {
        return AchievementRequestDto.builder()
                .title("Достижение")
                .description("Краткое описание")
                .content("<p>Содержание</p>")
                .previewImage(key)
                .display(true)
                .build();
    }

    private AchievementRequestDto requestWithoutCover() {
        return AchievementRequestDto.builder()
                .title("Достижение")
                .description("Краткое описание")
                .content("<p>Содержание</p>")
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
