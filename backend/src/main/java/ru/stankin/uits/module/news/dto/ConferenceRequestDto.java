package ru.stankin.uits.module.news.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ConferenceDatesConsistent
public class ConferenceRequestDto {
    @NotBlank(message = "Заголовок обязателен")
    @Size(max = 255, message = "Заголовок не длиннее 255 символов")
    String title;

    String description;

    LocalDate startDate;

    LocalDate endDate;

    LocalTime time;

    @Size(max = 255, message = "Организатор не длиннее 255 символов")
    String organizer;

    @Email(message = "Некорректный адрес почты")
    @Size(max = 254, message = "Адрес почты не длиннее 254 символов")
    String contactEmail;

    @Size(max = 32, message = "Телефон не длиннее 32 символов")
    String contactPhone;

    String content;

    @Size(max = 100)
    String previewImage;

    @Size(max = 256)
    String previewImageDescription;

    @NotNull(message = "Флаг видимости обязателен")
    Boolean display;
}
