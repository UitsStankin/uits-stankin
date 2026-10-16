package ru.stankin.uits.module.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UserAdminUpdateRequestDto {

    @Email(message = "Некорректный адрес почты")
    @Size(max = 254, message = "Адрес почты не длиннее 254 символов")
    private String email;

    @Size(max = 150, message = "Имя не длиннее 150 символов")
    private String firstName;

    @Size(max = 150, message = "Фамилия не длиннее 150 символов")
    private String lastName;

    @NotNull(message = "Признак администратора обязателен")
    private Boolean superuser;

    @NotNull(message = "Признак модератора обязателен")
    private Boolean moderator;

    @NotNull(message = "Признак преподавателя обязателен")
    private Boolean teacher;

    @NotNull(message = "Признак активности обязателен")
    private Boolean active;
}
