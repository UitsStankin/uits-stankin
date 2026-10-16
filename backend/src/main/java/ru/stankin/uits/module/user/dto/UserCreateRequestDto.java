package ru.stankin.uits.module.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import ru.stankin.uits.common.validation.BcryptCompatible;

@Data
public class UserCreateRequestDto {

    @NotBlank(message = "Логин обязателен")
    @Size(max = 150, message = "Логин не длиннее 150 символов")
    private String username;

    @NotBlank(message = "Пароль обязателен")
    @Size(min = 8, message = "Пароль должен быть минимум 8 символов")
    @BcryptCompatible
    private String password;

    @Email(message = "Некорректный адрес почты")
    @Size(max = 254, message = "Адрес почты не длиннее 254 символов")
    private String email;

    @Size(max = 150, message = "Имя не длиннее 150 символов")
    private String firstName;

    @Size(max = 150, message = "Фамилия не длиннее 150 символов")
    private String lastName;

    private boolean superuser;
    private boolean moderator;
    private boolean teacher;
}
