package ru.stankin.uits.module.pages;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import ru.stankin.uits.AbstractIntegrationTest;
import ru.stankin.uits.TestRole;
import ru.stankin.uits.module.news.dto.NewsRequestDto;
import ru.stankin.uits.module.news.dto.NewsResponseDto;
import ru.stankin.uits.module.news.entity.NewsPost;
import ru.stankin.uits.module.news.repository.NewsRepository;
import ru.stankin.uits.module.pages.entity.EditablePage;
import ru.stankin.uits.module.pages.repository.EditablePageRepository;
import ru.stankin.uits.module.user.entity.User;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Один и тот же файл может стоять обложкой новости и лежать картинкой в Markdown
 * редактируемого раздела. Уборка после правки новости обязана видеть вторую ссылку,
 * иначе раздел останется с битой картинкой.
 */
public class PageImageRetentionIntegrationTest extends AbstractIntegrationTest {

    private static final String WRITABLE_SLUG = "home-after";

    @Autowired
    private NewsRepository newsRepository;

    @Autowired
    private EditablePageRepository editablePageRepository;

    // Таблица разделов не входит в TRUNCATE базового класса: разделы засеваются один раз
    // на весь контекст, поэтому изменённый текст возвращается вручную.
    @AfterEach
    void restoreEditableSection() {
        editablePageRepository.findBySlug(WRITABLE_SLUG).ifPresent(section -> {
            section.setText("");
            editablePageRepository.save(section);
        });
    }

    @Test
    void updateNews_WhenOldCoverIsUsedInsideEditablePageText_KeepsFile() throws IOException {
        User admin = createUser("admin", TestRole.ADMIN);
        String token = login("admin");
        String sharedKey = storeFile("news");
        String newKey = storeFile("news");

        EditablePage section = editablePageRepository.findBySlug(WRITABLE_SLUG).orElseThrow();
        section.setText("![Иллюстрация](/media/" + sharedKey + ")");
        editablePageRepository.save(section);

        NewsPost saved = newsRepository.save(NewsPost.builder()
                .title("Новость с общей картинкой")
                .shortDescription("Описание")
                .postType("news")
                .content("Текст")
                .display(true)
                .previewImage(sharedKey)
                .author(admin)
                .build());

        ResponseEntity<NewsResponseDto> response = restTemplate.exchange(
                "/api/news/" + saved.getId(),
                HttpMethod.PUT,
                withToken(requestWithCover(newKey), token),
                NewsResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(newsRepository.findById(saved.getId()).orElseThrow().getPreviewImage()).isEqualTo(newKey);
        assertThat(STORAGE_ROOT.resolve(sharedKey)).exists();
        assertThat(STORAGE_ROOT.resolve(newKey)).exists();
    }

    private NewsRequestDto requestWithCover(String key) {
        return NewsRequestDto.builder()
                .title("Новость с общей картинкой")
                .shortDescription("Описание")
                .postType("news")
                .content("Текст")
                .display(true)
                .previewImage(key)
                .build();
    }

    private <T> HttpEntity<T> withToken(T body, String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);

        return new HttpEntity<>(body, headers);
    }
}
