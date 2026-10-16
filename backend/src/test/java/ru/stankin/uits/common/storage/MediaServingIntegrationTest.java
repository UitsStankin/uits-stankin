package ru.stankin.uits.common.storage;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import ru.stankin.uits.AbstractIntegrationTest;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "application.storage.serve-media=true"
)
class MediaServingIntegrationTest extends AbstractIntegrationTest {

    @Test
    @DisplayName("С включённой раздачей файл отдаётся по адресу без токена, как в разработке за прокси Vite")
    void media_WhenServingEnabled_ReturnsFileWithoutToken() throws IOException {
        String key = storeFile("news");

        ResponseEntity<byte[]> response = restTemplate.getForEntity("/media/" + key, byte[].class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(new String(response.getBody(), StandardCharsets.UTF_8)).isEqualTo("содержимое картинки");
    }
}
