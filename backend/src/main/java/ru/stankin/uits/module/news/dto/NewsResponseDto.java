package ru.stankin.uits.module.news.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NewsResponseDto {
    Long id;
    String title;
    String shortDescription;
    String postType;
    String previewImage;
    String previewImageUrl;
    String previewThumbnailUrl;
    String previewImageDescription;
    String content;
    OffsetDateTime createdAt;
    Boolean display;
    String authorName;
}
