package ru.stankin.uits.module.staff.dto;

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
public class SubjectRequestDto {
    @NotBlank(message = "Название дисциплины обязательно")
    @Size(max = 100, message = "Название дисциплины не длиннее 100 символов")
    String name;
}
