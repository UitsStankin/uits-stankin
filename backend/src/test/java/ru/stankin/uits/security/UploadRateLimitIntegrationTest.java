package ru.stankin.uits.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import ru.stankin.uits.AbstractIntegrationTest;
import ru.stankin.uits.TestRole;
import ru.stankin.uits.common.storage.FileUploadResponseDto;
import ru.stankin.uits.module.user.dto.UserResponseDto;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "application.security.upload-rate-limit.attempts=2"
)
class UploadRateLimitIntegrationTest extends AbstractIntegrationTest {

    private static final int ATTEMPTS = 2;

    @Test
    @DisplayName("Лимит загрузок: сверх нормы — 429 с Retry-After, другой пользователь проходит")
    void upload_WhenAttemptsExceedLimit_Returns429ButOtherUserPasses() throws IOException {
        createUser("greedy_uploader", TestRole.ADMIN);
        createUser("calm_uploader", TestRole.ADMIN);
        String greedyToken = login("greedy_uploader");
        String calmToken = login("calm_uploader");

        for (int attempt = 0; attempt < ATTEMPTS; attempt++) {
            assertThat(upload(greedyToken).getStatusCode()).isEqualTo(HttpStatus.CREATED);
        }

        ResponseEntity<ProblemDetail> blocked = restTemplate.postForEntity(
                "/api/files", multipart(image(), greedyToken), ProblemDetail.class);

        assertThat(blocked.getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
        assertThat(blocked.getHeaders().getFirst(HttpHeaders.RETRY_AFTER)).isNotNull();
        assertThat(blocked.getBody()).isNotNull();
        assertThat(blocked.getBody().getDetail()).isEqualTo("Слишком много загрузок файлов. Повторите позже.");

        assertThat(upload(calmToken).getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }

    @Test
    @DisplayName("Исчерпанный лимит загрузок не задевает GET-ручки того же пользователя")
    void get_WhenUploadLimitExceeded_StillReturns200() throws IOException {
        createUser("blocked_reader", TestRole.ADMIN);
        String token = login("blocked_reader");

        for (int attempt = 0; attempt < ATTEMPTS; attempt++) {
            assertThat(upload(token).getStatusCode()).isEqualTo(HttpStatus.CREATED);
        }
        assertThat(upload(token).getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        ResponseEntity<UserResponseDto> profile = restTemplate.exchange(
                "/api/users/profile", HttpMethod.GET, new HttpEntity<>(headers), UserResponseDto.class);

        assertThat(profile.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    private ResponseEntity<FileUploadResponseDto> upload(String token) throws IOException {
        return restTemplate.postForEntity("/api/files", multipart(image(), token),
                FileUploadResponseDto.class);
    }

    private HttpEntity<MultiValueMap<String, Object>> multipart(byte[] content, String token) {
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", new ByteArrayResource(content) {
            @Override
            public String getFilename() {
                return "photo.jpg";
            }
        });
        body.add("category", "news");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        headers.setBearerAuth(token);

        return new HttpEntity<>(body, headers);
    }

    private byte[] image() throws IOException {
        BufferedImage image = new BufferedImage(300, 300, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, "jpeg", out);

        return out.toByteArray();
    }
}
