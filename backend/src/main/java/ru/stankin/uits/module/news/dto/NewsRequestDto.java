package ru.stankin.uits.module.news.dto;

import jakarta.validation.constraints.NotBlank;
import ru.stankin.uits.common.validation.SafeHtmlNotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import ru.stankin.uits.module.news.PostType;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NewsRequestDto {
    @NotBlank(message = "Заголовок обязателен")
    @Size(min = 5, max = 100, message = "Заголовок должен быть от 5 до 100 символов")
    String title;

    @Size(max = 255, message = "Краткое описание длиннее 255 символов")
    String shortDescription;

    @Pattern(regexp = PostType.PATTERN, message = "Тип записи может быть только news или announcements")
    @NotBlank(message = "Тип записи обязателен")
    String postType;

    @Size(max = 100, message = "Ключ обложки длиннее 100 символов")
    String previewImage;
    @Size(max = 256, message = "Описание обложки длиннее 256 символов")
    String previewImageDescription;

    @NotBlank(message = "Текст новости обязателен")
    @SafeHtmlNotBlank(message = "Текст новости пуст после удаления небезопасной разметки")
    String content;

    @NotNull(message = "Признак публикации обязателен")
    Boolean display;
}
