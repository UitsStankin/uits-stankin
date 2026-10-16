package ru.stankin.uits.module.students.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import ru.stankin.uits.module.students.enums.EducationLevel;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentRequestDto {
    @NotBlank(message = "Фамилия обязательна")
    @Size(max = 50)
    String lastName;

    @NotBlank(message = "Имя обязательно")
    @Size(max = 50)
    String firstName;

    @Size(max = 50)
    String patronymic;

    @NotBlank(message = "Группа обязательна")
    @Size(max = 16)
    String group;

    @NotNull(message = "Уровень образования обязателен")
    EducationLevel educationLevel;

    @Size(max = 100)
    String speciality;

    String diplomaTheme;

    @NotNull(message = "Год поступления обязателен")
    @Min(value = 2000, message = "Год поступления не раньше 2000")
    Integer admissionYear;
}
