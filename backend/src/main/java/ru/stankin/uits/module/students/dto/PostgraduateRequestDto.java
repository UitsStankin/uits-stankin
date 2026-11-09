package ru.stankin.uits.module.students.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PostgraduateRequestDto {
    @NotNull(message = "Данные аспиранта обязательны")
    @Valid
    StudentRequestDto student;

    Long teacherId;
}
