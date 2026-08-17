package ru.stankin.uits.common.storage;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import ru.stankin.uits.AbstractIntegrationTest;
import ru.stankin.uits.module.auth.controller.AuthController;
import ru.stankin.uits.module.user.entity.User;
import ru.stankin.uits.module.user.repository.UserRepository;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
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

    private static final Path STORAGE_ROOT;

    static {
        try {
            STORAGE_ROOT = Files.createTempDirectory("uits-media-test");
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @DynamicPropertySource
    static void storageProperties(DynamicPropertyRegistry registry) {
        registry.add("application.storage.root", STORAGE_ROOT::toString);
    }

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void upload_WhenAdmin_Returns201AndWritesFile() throws IOException {
        createUser("admin", true, false);
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
        createUser("moderator", false, true);
        String token = login("moderator");

        ResponseEntity<FileUploadResponseDto> response = restTemplate.postForEntity(
                "/api/files", multipart(image(300, 300), "photo.jpg", "news", token),
                FileUploadResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }

    /** Загрузка файлов — право редактора: обычный пользователь не должен занимать диск. */
    @Test
    void upload_WhenPlainUser_Returns403() throws IOException {
        createUser("user", false, false);
        String token = login("user");

        ResponseEntity<ProblemDetail> response = restTemplate.postForEntity(
                "/api/files", multipart(image(300, 300), "photo.jpg", "news", token),
                ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
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
        createUser("admin", true, false);
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
        createUser("admin", true, false);
        String token = login("admin");

        ResponseEntity<ProblemDetail> response = restTemplate.postForEntity(
                "/api/files", multipart(image(300, 300), "photo.jpg", "unknown", token),
                ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    /** Адрес из ответа должен работать без токена: картинки открывают посетители сайта. */
    @Test
    void uploadedFile_IsServedByReturnedUrlWithoutToken() throws IOException {
        createUser("admin", true, false);
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

    private void createUser(String username, boolean superuser, boolean moderator) {
        userRepository.save(User.builder()
                .username(username)
                .password(passwordEncoder.encode("password"))
                .superuser(superuser)
                .moderator(moderator)
                .active(true)
                .build());
    }

    private String login(String username) {
        AuthController.LoginRequest request = new AuthController.LoginRequest(username, "password");
        ResponseEntity<AuthController.LoginResponse> response = restTemplate.postForEntity(
                "/api/users/auth/login", request, AuthController.LoginResponse.class);

        assertThat(response.getBody()).isNotNull();
        return response.getBody().accessToken();
    }
}
