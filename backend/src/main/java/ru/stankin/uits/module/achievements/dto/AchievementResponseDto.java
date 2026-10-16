package ru.stankin.uits.module.achievements.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AchievementResponseDto {
    Long id;
    String title;
    String description;
    String content;
    String previewImage;
    String previewImageUrl;
    OffsetDateTime createdAt;
    Boolean display;
    Long teacherId;
    String teacherName;
}
