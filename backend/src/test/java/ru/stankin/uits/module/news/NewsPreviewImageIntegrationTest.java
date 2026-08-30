package ru.stankin.uits.module.news;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.transaction.annotation.Transactional;
import ru.stankin.uits.AbstractIntegrationTest;
import ru.stankin.uits.TestRole;
import ru.stankin.uits.common.PageResponseDto;
import ru.stankin.uits.module.news.dto.NewsRequestDto;
import ru.stankin.uits.module.news.dto.NewsResponseDto;
import ru.stankin.uits.module.news.entity.NewsPost;
import ru.stankin.uits.module.news.repository.NewsRepository;
import ru.stankin.uits.module.news.service.NewsService;
import ru.stankin.uits.module.user.entity.User;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Превью-изображение новости (T-23): проверка ключа обложки, адрес картинки в ответе
 * и уборка файла, переставшего быть чьей-либо обложкой.
 *
 * <p>Каталог хранилища подменяется на временный, чтобы тесты не писали в рабочую папку
 * проекта и не удаляли оттуда файлы. Фикстуры кладутся на диск напрямую: ручка загрузки
 * проверяется отдельно в {@code FileUploadIntegrationTest}, здесь она была бы лишним
 * звеном и лишним поводом для ложных падений.
 */
public class NewsPreviewImageIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private NewsRepository newsRepository;

    @Autowired
    private NewsService newsService;

    /**
     * Ключ, которому не соответствует файл, означает битую картинку у каждого посетителя.
     * Ошибки при этом не было бы: 200 и молча сломанная главная страница.
     */
    @Test
    void createNews_WhenCoverMissingInStorage_Returns400() {
        String token = createAdminAndLogin();

        ResponseEntity<ProblemDetail> response = restTemplate.postForEntity(
                "/api/news",
                withToken(requestWithCover("news/2026/08/never-uploaded.jpg"), token),
                ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getDetail()).contains("never-uploaded.jpg");
        assertThat(newsRepository.findAll()).isEmpty();
    }

    /** Побег из хранилища — ошибка запроса, а не авария сервера: 500 отдаёт стектрейс в мониторинг. */
    @Test
    void createNews_WhenCoverEscapesStorage_Returns400() {
        String token = createAdminAndLogin();

        ResponseEntity<ProblemDetail> response = restTemplate.postForEntity(
                "/api/news",
                withToken(requestWithCover("../../application.yaml"), token),
                ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(newsRepository.findAll()).isEmpty();
    }

    /**
     * Фронт получает готовый адрес: правило «ключ → URL» знает только хранилище,
     * и при переезде на S3 клиент меняться не должен.
     */
    @Test
    void createNews_WhenCoverExists_ReturnsUrlAndDescription() throws IOException {
        String token = createAdminAndLogin();
        String key = storeFile();

        ResponseEntity<NewsResponseDto> response = restTemplate.postForEntity(
                "/api/news", withToken(requestWithCover(key), token), NewsResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        NewsResponseDto body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.getPreviewImage()).isEqualTo(key);
        assertThat(body.getPreviewImageUrl()).isEqualTo("/media/" + key);
        assertThat(body.getPreviewImageDescription()).isEqualTo("Подпись к обложке");
    }

    /**
     * Миниатюра лежит рядом с обложкой и попадает в ответ отдельным адресом:
     * лента показывает карточки размером в пару сотен пикселей, и тянуть ради них
     * полноразмерный файл незачем.
     */
    @Test
    void createNews_WhenThumbnailExists_ReturnsItsUrl() throws IOException {
        String token = createAdminAndLogin();
        String key = storeFile();
        String thumbnailKey = storeThumbnailFor(key);

        ResponseEntity<NewsResponseDto> response = restTemplate.postForEntity(
                "/api/news", withToken(requestWithCover(key), token), NewsResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getPreviewThumbnailUrl()).isEqualTo("/media/" + thumbnailKey);
    }

    /**
     * У новостей, загруженных до появления миниатюр, второго файла нет.
     * Адрес в таком случае обязан быть пустым, а не указывать в никуда.
     */
    @Test
    void createNews_WhenThumbnailMissing_ReturnsNullUrl() throws IOException {
        String token = createAdminAndLogin();
        String key = storeFile();

        ResponseEntity<NewsResponseDto> response = restTemplate.postForEntity(
                "/api/news", withToken(requestWithCover(key), token), NewsResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getPreviewThumbnailUrl()).isNull();
    }

    /** Смена обложки уносит и старую миниатюру: иначе она остаётся в хранилище навсегда. */
    @Test
    void updateNews_WhenCoverReplaced_DeletesOldThumbnail() throws IOException {
        String token = createAdminAndLogin();
        String oldKey = storeFile();
        String oldThumbnail = storeThumbnailFor(oldKey);
        String newKey = storeFile();
        storeThumbnailFor(newKey);

        ResponseEntity<NewsResponseDto> created = restTemplate.postForEntity(
                "/api/news", withToken(requestWithCover(oldKey), token), NewsResponseDto.class);
        assertThat(created.getBody()).isNotNull();

        ResponseEntity<NewsResponseDto> updated = restTemplate.exchange(
                "/api/news/" + created.getBody().getId(),
                HttpMethod.PUT,
                withToken(requestWithCover(newKey), token),
                NewsResponseDto.class);

        assertThat(updated.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(STORAGE_ROOT.resolve(oldThumbnail)).doesNotExist();
        assertThat(updated.getBody()).isNotNull();
        assertThat(updated.getBody().getPreviewThumbnailUrl())
                .isEqualTo("/media/" + newKey.replace(".jpg", "_thumb.jpg"));
    }

    /** Новость без обложки законна, и адрес у неё пустой, а не строка «/media/null». */
    @Test
    void createNews_WhenNoCover_ReturnsNullUrl() {
        String token = createAdminAndLogin();

        ResponseEntity<NewsResponseDto> response = restTemplate.postForEntity(
                "/api/news", withToken(requestWithoutCover(), token), NewsResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getPreviewImage()).isNull();
        assertThat(response.getBody().getPreviewImageUrl()).isNull();
    }

    /** Вторая дверь в базу: правка обязана проверять ключ так же, как создание. */
    @Test
    void updateNews_WhenCoverMissingInStorage_Returns400AndKeepsOldCover() throws IOException {
        User admin = createAdmin();
        String token = login("admin");
        String key = storeFile();
        NewsPost saved = saveNews(admin, key);

        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/news/" + saved.getId(),
                HttpMethod.PUT,
                withToken(requestWithCover("news/2026/08/never-uploaded.jpg"), token),
                ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(newsRepository.findById(saved.getId()).orElseThrow().getPreviewImage()).isEqualTo(key);
        assertThat(STORAGE_ROOT.resolve(key)).exists();
    }

    @Test
    void updateNews_WhenCoverReplaced_DeletesOldFile() throws IOException {
        User admin = createAdmin();
        String token = login("admin");
        String oldKey = storeFile();
        String newKey = storeFile();
        NewsPost saved = saveNews(admin, oldKey);

        ResponseEntity<NewsResponseDto> response = restTemplate.exchange(
                "/api/news/" + saved.getId(),
                HttpMethod.PUT,
                withToken(requestWithCover(newKey), token),
                NewsResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(STORAGE_ROOT.resolve(oldKey)).doesNotExist();
        assertThat(STORAGE_ROOT.resolve(newKey)).exists();
    }

    @Test
    void updateNews_WhenCoverRemoved_DeletesOldFile() throws IOException {
        User admin = createAdmin();
        String token = login("admin");
        String key = storeFile();
        NewsPost saved = saveNews(admin, key);

        ResponseEntity<NewsResponseDto> response = restTemplate.exchange(
                "/api/news/" + saved.getId(),
                HttpMethod.PUT,
                withToken(requestWithoutCover(), token),
                NewsResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getPreviewImage()).isNull();
        assertThat(STORAGE_ROOT.resolve(key)).doesNotExist();
    }

    @Test
    void updateNews_WhenCoverKeyIsBlank_RemovesCoverAndDeletesFile() throws IOException {
        User admin = createAdmin();
        String token = login("admin");
        String key = storeFile();
        NewsPost saved = saveNews(admin, key);

        ResponseEntity<NewsResponseDto> response = restTemplate.exchange(
                "/api/news/" + saved.getId(),
                HttpMethod.PUT,
                withToken(requestWithCover(""), token),
                NewsResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getPreviewImage()).isNull();
        assertThat(STORAGE_ROOT.resolve(key)).doesNotExist();
    }

    /**
     * PUT — полная замена, и форма присылает тот же ключ при правке одного заголовка.
     * Удаление «того, что было до правки» без сравнения стёрло бы картинку живой новости.
     */
    @Test
    void updateNews_WhenCoverUnchanged_KeepsFile() throws IOException {
        User admin = createAdmin();
        String token = login("admin");
        String key = storeFile();
        NewsPost saved = saveNews(admin, key);

        ResponseEntity<NewsResponseDto> response = restTemplate.exchange(
                "/api/news/" + saved.getId(),
                HttpMethod.PUT,
                withToken(requestWithCover(key), token),
                NewsResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(STORAGE_ROOT.resolve(key)).exists();
    }

    @Test
    void deleteNews_WhenCoverPresent_DeletesFile() throws IOException {
        User admin = createAdmin();
        String token = login("admin");
        String key = storeFile();
        NewsPost saved = saveNews(admin, key);

        ResponseEntity<Void> response = restTemplate.exchange(
                "/api/news/" + saved.getId(), HttpMethod.DELETE, withToken(token), Void.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(STORAGE_ROOT.resolve(key)).doesNotExist();
    }

    /** Постраничная выдача идёт через отдельный вызов маппера — адрес должен быть и там. */
    @Test
    void publishedList_ReturnsCoverUrl() throws IOException {
        User admin = createAdmin();
        String key = storeFile();
        saveNews(admin, key);

        ResponseEntity<PageResponseDto<NewsResponseDto>> response = restTemplate.exchange(
                "/api/public/news",
                HttpMethod.GET,
                null,
                new ParameterizedTypeReference<>() {});

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().content()).hasSize(1);
        assertThat(response.getBody().content().getFirst().getPreviewImageUrl()).isEqualTo("/media/" + key);
    }

    /**
     * Диск транзакцию не откатывает, поэтому удаление отложено до успешного коммита.
     * Здесь сервис вызывается внутри транзакции теста, которая не коммитится, — файл
     * обязан остаться. Уберите откладывание, и тест покраснеет: файла не будет.
     */
    @Test
    @Transactional
    void updateNews_WhenTransactionNotCommitted_KeepsFile() throws IOException {
        User admin = createAdmin();
        String key = storeFile();
        NewsPost saved = saveNews(admin, key);

        newsService.updateNews(saved.getId(), requestWithoutCover());

        assertThat(STORAGE_ROOT.resolve(key)).exists();
    }

    /**
     * Ключ из чужого раздела хранилища: файл существует, но это аватар, а не обложка.
     * Приняв такой ключ, портал показал бы чужую картинку и удалил бы её при следующей
     * правке новости (D-13).
     */
    @Test
    void createNews_WhenCoverFromOtherCategory_Returns400() throws IOException {
        String token = createAdminAndLogin();
        String avatarKey = storeFileIn("avatars");

        ResponseEntity<ProblemDetail> response = restTemplate.postForEntity(
                "/api/news",
                withToken(requestWithCover(avatarKey), token),
                ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(newsRepository.findAll()).isEmpty();
        assertThat(STORAGE_ROOT.resolve(avatarKey)).exists();
    }

    /**
     * Один файл стоит обложкой у двух новостей. Удаление первой не должно оставлять
     * вторую с битой картинкой; файл уходит с диска вместе с последней ссылкой.
     */
    @Test
    void deleteNews_WhenCoverSharedWithAnotherNews_KeepsFileUntilLastReferenceGone() throws IOException {
        User admin = createAdmin();
        String token = login("admin");
        String sharedKey = storeFile();
        NewsPost first = saveNews(admin, sharedKey);
        NewsPost second = saveNews(admin, sharedKey);

        restTemplate.exchange("/api/news/" + first.getId(), HttpMethod.DELETE,
                withToken(token), Void.class);

        assertThat(STORAGE_ROOT.resolve(sharedKey)).exists();

        restTemplate.exchange("/api/news/" + second.getId(), HttpMethod.DELETE,
                withToken(token), Void.class);

        assertThat(STORAGE_ROOT.resolve(sharedKey)).doesNotExist();
    }

    private String storeFileIn(String category) throws IOException {
        String key = category + "/2026/08/" + UUID.randomUUID() + ".jpg";
        Path target = STORAGE_ROOT.resolve(key);
        Files.createDirectories(target.getParent());
        Files.writeString(target, "содержимое картинки");

        return key;
    }

    private String storeThumbnailFor(String key) throws IOException {
        String thumbnailKey = key.replace(".jpg", "_thumb.jpg");
        Path target = STORAGE_ROOT.resolve(thumbnailKey);
        Files.createDirectories(target.getParent());
        Files.writeString(target, "содержимое миниатюры");

        return thumbnailKey;
    }

    private String storeFile() throws IOException {
        String key = "news/2026/08/" + UUID.randomUUID() + ".jpg";
        Path target = STORAGE_ROOT.resolve(key);
        Files.createDirectories(target.getParent());
        Files.writeString(target, "содержимое картинки");

        return key;
    }

    private NewsRequestDto requestWithCover(String key) {
        return NewsRequestDto.builder()
                .title("Test News Title")
                .shortDescription("Test Description")
                .postType("news")
                .content("Test Content")
                .display(true)
                .previewImage(key)
                .previewImageDescription("Подпись к обложке")
                .build();
    }

    private NewsRequestDto requestWithoutCover() {
        return NewsRequestDto.builder()
                .title("Test News Title")
                .shortDescription("Test Description")
                .postType("news")
                .content("Test Content")
                .display(true)
                .build();
    }

    private NewsPost saveNews(User author, String key) {
        NewsPost post = NewsPost.builder()
                .title("Existing News")
                .shortDescription("Desc")
                .postType("news")
                .content("Content")
                .display(true)
                .previewImage(key)
                .previewImageDescription("Подпись к обложке")
                .author(author)
                .build();

        return newsRepository.save(post);
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

    private User createAdmin() {
        return createUser("admin", TestRole.ADMIN);
    }

    private String createAdminAndLogin() {
        createAdmin();

        return login("admin");
    }

}
