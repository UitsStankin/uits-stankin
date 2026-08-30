package ru.stankin.uits.common.storage;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import ru.stankin.uits.AbstractIntegrationTest;
import ru.stankin.uits.TestRole;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Тесты ручки загрузки: права, отказы и то, что файл действительно отдаётся
 * по возвращённому адресу. Каталог хранилища подменяется на временный, чтобы тесты
 * не писали в рабочую папку проекта.
 */
public class FileUploadIntegrationTest extends AbstractIntegrationTest {

    @Test
    void upload_WhenAdmin_Returns201AndWritesFile() throws IOException {
        createUser("admin", TestRole.ADMIN);
        String token = login("admin");

        ResponseEntity<FileUploadResponseDto> response = restTemplate.postForEntity(
                "/api/files", multipart(image(800, 600), "photo.jpg", "news", token),
                FileUploadResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();

        String key = response.getBody().key();
        assertThat(key).startsWith("news/").endsWith(".jpg");
        assertThat(response.getBody().url()).isEqualTo("/media/" + key);
        assertThat(STORAGE_ROOT.resolve(key)).exists();
    }

    @Test
    void upload_WhenModerator_Returns201() throws IOException {
        createUser("moderator", TestRole.MODERATOR);
        String token = login("moderator");

        ResponseEntity<FileUploadResponseDto> response = restTemplate.postForEntity(
                "/api/files", multipart(image(300, 300), "photo.jpg", "news", token),
                FileUploadResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }

    /**
     * Контент портала грузят редакторы: чужой раздел обычному пользователю закрыт,
     * даже когда собственный аватар ему разрешён.
     */
    @Test
    void upload_WhenPlainUser_Returns403() throws IOException {
        createUser("user", TestRole.USER);
        String token = login("user");

        ResponseEntity<ProblemDetail> response = restTemplate.postForEntity(
                "/api/files", multipart(image(300, 300), "photo.jpg", "news", token),
                ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    /** Аватар меняет владелец учётной записи, а не редактор: раздел avatars открыт всем авторизованным. */
    @Test
    void upload_WhenPlainUserUploadsAvatar_Returns201() throws IOException {
        createUser("user", TestRole.USER);
        String token = login("user");

        ResponseEntity<FileUploadResponseDto> response = restTemplate.postForEntity(
                "/api/files", multipart(image(300, 300), "photo.jpg", "avatars", token),
                FileUploadResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().key()).startsWith("avatars/");
        assertThat(STORAGE_ROOT.resolve(response.getBody().key())).exists();
    }

    @Test
    void upload_WhenAnonymousUploadsAvatar_Returns401() throws IOException {
        ResponseEntity<ProblemDetail> response = restTemplate.postForEntity(
                "/api/files", multipart(image(300, 300), "photo.jpg", "avatars", null),
                ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void upload_WhenAnonymous_Returns401() throws IOException {
        ResponseEntity<ProblemDetail> response = restTemplate.postForEntity(
                "/api/files", multipart(image(300, 300), "photo.jpg", "news", null),
                ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    /** Расширение .jpg ничего не доказывает: формат определяется по содержимому. */
    @Test
    void upload_WhenExecutableRenamedToJpg_Returns400() {
        createUser("admin", TestRole.ADMIN);
        String token = login("admin");
        byte[] executable = "MZ это не картинка".getBytes(StandardCharsets.UTF_8);

        ResponseEntity<ProblemDetail> response = restTemplate.postForEntity(
                "/api/files", multipart(executable, "photo.jpg", "news", token),
                ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getDetail()).contains("не является изображением");
    }

    /** Раздел приходит от клиента и попадает в путь на диске — принимаем только известные. */
    @Test
    void upload_WhenUnknownCategory_Returns400() throws IOException {
        createUser("admin", TestRole.ADMIN);
        String token = login("admin");

        ResponseEntity<ProblemDetail> response = restTemplate.postForEntity(
                "/api/files", multipart(image(300, 300), "photo.jpg", "unknown", token),
                ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    /** Адрес из ответа должен работать без токена: картинки открывают посетители сайта. */
    @Test
    void uploadedFile_IsServedByReturnedUrlWithoutToken() throws IOException {
        createUser("admin", TestRole.ADMIN);
        String token = login("admin");
        ResponseEntity<FileUploadResponseDto> upload = restTemplate.postForEntity(
                "/api/files", multipart(image(800, 600), "photo.jpg", "news", token),
                FileUploadResponseDto.class);
        assertThat(upload.getBody()).isNotNull();

        ResponseEntity<byte[]> served = restTemplate.getForEntity(upload.getBody().url(), byte[].class);

        assertThat(served.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(served.getBody()).isNotEmpty();
        assertThat(ImageIO.read(new java.io.ByteArrayInputStream(served.getBody()))).isNotNull();
    }

    @Test
    void upload_WhenPdfGoesToPublications_Returns201() {
        createUser("moderator_pdf", TestRole.MODERATOR);
        String token = login("moderator_pdf");

        ResponseEntity<FileUploadResponseDto> response = restTemplate.postForEntity(
                "/api/files", multipart(pdf(), "article.pdf", "publications", token),
                FileUploadResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();

        String key = response.getBody().key();
        assertThat(key).startsWith("publications/").endsWith(".pdf");
        assertThat(STORAGE_ROOT.resolve(key)).exists();
    }

    @Test
    void upload_WhenFileInPublicationsIsNotPdf_Returns400() throws IOException {
        createUser("moderator_img", TestRole.MODERATOR);
        String token = login("moderator_img");

        ResponseEntity<ProblemDetail> response = restTemplate.postForEntity(
                "/api/files", multipart(image(300, 300), "photo.jpg", "publications", token),
                ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void upload_WhenPdfExtensionButNotPdfContent_Returns400() {
        createUser("moderator_fake", TestRole.MODERATOR);
        String token = login("moderator_fake");

        ResponseEntity<ProblemDetail> response = restTemplate.postForEntity(
                "/api/files", multipart("совсем не pdf".getBytes(StandardCharsets.UTF_8),
                        "article.pdf", "publications", token),
                ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void upload_WhenPdfGoesToNews_Returns400() {
        createUser("moderator_news", TestRole.MODERATOR);
        String token = login("moderator_news");

        ResponseEntity<ProblemDetail> response = restTemplate.postForEntity(
                "/api/files", multipart(pdf(), "article.pdf", "news", token),
                ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void upload_WhenPlainUserUploadsPdf_Returns403() {
        createUser("plain_pdf", TestRole.USER);
        String token = login("plain_pdf");

        ResponseEntity<ProblemDetail> response = restTemplate.postForEntity(
                "/api/files", multipart(pdf(), "article.pdf", "publications", token),
                ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void upload_WhenImageGoesToNews_AlsoWritesThumbnail() throws IOException {
        createUser("moderator_thumb", TestRole.MODERATOR);
        String token = login("moderator_thumb");

        ResponseEntity<FileUploadResponseDto> response = restTemplate.postForEntity(
                "/api/files", multipart(image(1200, 900), "photo.jpg", "news", token),
                FileUploadResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();

        String key = response.getBody().key();
        Path thumbnail = STORAGE_ROOT.resolve(key.replace(".jpg", "_thumb.jpg"));

        assertThat(thumbnail).exists();
        assertThat(Files.size(thumbnail)).isLessThan(Files.size(STORAGE_ROOT.resolve(key)));
    }

    @Test
    void upload_WhenAvatar_HasNoThumbnail() throws IOException {
        createUser("user_thumb", TestRole.USER);
        String token = login("user_thumb");

        ResponseEntity<FileUploadResponseDto> response = restTemplate.postForEntity(
                "/api/files", multipart(image(600, 600), "photo.jpg", "avatars", token),
                FileUploadResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(STORAGE_ROOT.resolve(response.getBody().key().replace(".jpg", "_thumb.jpg")))
                .doesNotExist();
    }

    private byte[] pdf() {
        return "%PDF-1.4 test document".getBytes(StandardCharsets.US_ASCII);
    }

    private HttpEntity<MultiValueMap<String, Object>> multipart(byte[] content,
                                                                String filename,
                                                                String category,
                                                                String token) {
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", new ByteArrayResource(content) {
            @Override
            public String getFilename() {
                return filename;
            }
        });
        body.add("category", category);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        if (token != null) {
            headers.setBearerAuth(token);
        }

        return new HttpEntity<>(body, headers);
    }

    private byte[] image(int width, int height) throws IOException {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, "jpeg", out);

        return out.toByteArray();
    }

}
