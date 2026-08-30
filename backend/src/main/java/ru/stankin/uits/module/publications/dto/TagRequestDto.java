package ru.stankin.uits.module.publications.dto;

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
public class TagRequestDto {
    @NotBlank(message = "Название тега обязательно")
    @Size(max = 100, message = "Название тега не длиннее 100 символов")
    String name;
}
