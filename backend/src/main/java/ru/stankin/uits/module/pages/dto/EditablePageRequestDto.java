package ru.stankin.uits.module.pages.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import tools.jackson.databind.annotation.JsonDeserialize;
import tools.jackson.databind.deser.jdk.StringDeserializer;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EditablePageRequestDto {
    @NotBlank(message = "Title cant be empty")
    @Size(max = 255)
    String title;

    @NotNull(message = "Text is required")
    @JsonDeserialize(using = StringDeserializer.class)
    String text;
}
