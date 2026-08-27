package ru.stankin.uits.module.news.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConferenceResponseDto {
    Long id;
    String title;
    String description;
    LocalDate startDate;
    LocalDate endDate;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "HH:mm")
    LocalTime time;
    String organizer;
    String contactEmail;
    String contactPhone;
    String content;
    String previewImage;
    String previewImageUrl;
    String previewImageDescription;
    OffsetDateTime createdAt;
    Boolean display;
}
