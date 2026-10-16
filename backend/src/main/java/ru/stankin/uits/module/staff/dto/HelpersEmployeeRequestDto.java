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
public class HelpersEmployeeRequestDto {
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

    @Size(max = 100)
    String avatar;
}
