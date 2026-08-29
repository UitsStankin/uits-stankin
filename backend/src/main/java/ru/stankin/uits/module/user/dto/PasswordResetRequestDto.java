package ru.stankin.uits.module.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import ru.stankin.uits.common.validation.BcryptCompatible;

@Data
public class PasswordResetRequestDto {

    @NotBlank(message = "Новый пароль обязателен")
    @Size(min = 8, message = "Пароль должен быть минимум 8 символов")
    @BcryptCompatible
    private String newPassword;
}
