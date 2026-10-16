package ru.stankin.uits.module.publications.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import ru.stankin.uits.common.validation.SafeUrl;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicationRequestDto {
    @NotBlank(message = "Название обязательно")
    @Size(max = 200, message = "Название не длиннее 200 символов")
    String name;

    @NotEmpty(message = "Нужен хотя бы один автор")
    List<@NotBlank(message = "Имя автора не может быть пустым")
         @Size(max = 200, message = "Имя автора не длиннее 200 символов") String> authors;

    @NotBlank(message = "Описание обязательно")
    String description;

    @Size(max = 200, message = "Ссылка не длиннее 200 символов")
    @SafeUrl
    String url;

    @Size(max = 100, message = "Ключ файла не длиннее 100 символов")
    String file;

    @NotNull(message = "Год обязателен")
    @Min(value = 1900, message = "Год публикации не раньше 1900")
    Integer year;

    @NotBlank(message = "Источник обязателен")
    @Size(max = 200, message = "Источник не длиннее 200 символов")
    String source;

    @Size(max = 50, message = "Страницы не длиннее 50 символов")
    String pages;

    @Size(max = 100, message = "Том и номер не длиннее 100 символов")
    String volN;

    @Size(max = 20, message = "ISBN не длиннее 20 символов")
    String isbn;

    List<Long> tagIds;
}
