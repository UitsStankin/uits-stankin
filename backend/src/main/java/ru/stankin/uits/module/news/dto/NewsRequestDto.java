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

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NewsRequestDto {
    @NotBlank(message = "Title cant be empty")
    @Size(min = 5, max = 100, message = "Title must be from 5 to 100 symbols")
    String title;

    @Size(max = 255, message = "Short description is too long")
    String shortDescription;

    @Pattern(regexp = "news|announcements", message = "Post type must be news or announcements")
    @NotBlank(message = "Post type required")
    String postType;

    @Size(max = 100)
    String previewImage;
    @Size(max = 256)
    String previewImageDescription;

    @NotBlank(message = "Content cant be empty")
    @SafeHtmlNotBlank(message = "Текст новости пуст после удаления небезопасной разметки")
    String content;

    @NotNull(message = "Display flag is required")
    Boolean display;
}
