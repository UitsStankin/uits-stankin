package ru.stankin.uits.module.pages.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EditablePageResponseDto {
    private String slug;
    private String title;
    private String text;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
