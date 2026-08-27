package ru.stankin.uits.module.achievements.dto;

import jakarta.validation.constraints.NotBlank;
import ru.stankin.uits.common.validation.SafeHtmlNotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AchievementRequestDto {
    @NotBlank(message = "Заголовок обязателен")
    @Size(max = 100, message = "Заголовок не длиннее 100 символов")
    String title;

    @NotBlank(message = "Краткое описание обязательно")
    String description;

    @NotBlank(message = "Содержание обязательно")
    @SafeHtmlNotBlank(message = "Содержание пусто после удаления небезопасной разметки")
    String content;

    @NotBlank(message = "Обложка обязательна")
    @Size(max = 100, message = "Ключ обложки не длиннее 100 символов")
    String previewImage;

    @NotNull(message = "Флаг видимости обязателен")
    Boolean display;

    Long teacherId;
}
