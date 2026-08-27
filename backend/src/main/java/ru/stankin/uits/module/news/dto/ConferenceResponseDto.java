package ru.stankin.uits.module.news.dto;

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
