package ru.stankin.uits.module.staff.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import ru.stankin.uits.module.staff.enums.TeacherDegree;
import ru.stankin.uits.module.staff.enums.TeacherRank;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeacherRequestDto {
    @NotBlank(message = "Фамилия обязательна")
    @Size(max = 150)
    String lastName;

    @NotBlank(message = "Имя обязательно")
    @Size(max = 150)
    String firstName;

    @Size(max = 150)
    String patronymic;

    @NotBlank(message = "Должность обязательна")
    @Size(max = 100)
    String position;

    TeacherDegree degree;

    TeacherRank rank;

    @Size(max = 100)
    String avatar;

    @Size(max = 50)
    String phoneNumber;

    @Email(message = "Некорректный адрес почты")
    @Size(max = 254)
    String email;

    @Size(max = 50)
    String messenger;

    @PositiveOrZero(message = "Стаж не может быть отрицательным")
    Integer experience;

    @PositiveOrZero(message = "Стаж не может быть отрицательным")
    Integer professionalExperience;

    String education;

    String qualification;

    String bio;

    @Size(max = 200)
    String examScheduleGraduation;

    @Size(max = 200)
    String examScheduleNonGraduation;

    List<Long> subjectIds;
}
