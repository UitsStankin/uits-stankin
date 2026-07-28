package ru.stankin.uits.module.news.dto;

import jakarta.validation.constraints.NotBlank;
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

    @NotBlank(message = "Post type required")
    String postType;

    String previewImage;
    String previewImageDescription;

    @NotBlank(message = "Content cant be empty")
    String content;

    boolean display;
}
