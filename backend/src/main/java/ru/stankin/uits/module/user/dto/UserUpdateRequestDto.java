package ru.stankin.uits.module.user.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UserUpdateRequestDto {

    @Size(max = 150, message = "Имя не длиннее 150 символов")
    private String firstName;

    @Size(max = 150, message = "Фамилия не длиннее 150 символов")
    private String lastName;

    @Size(max = 100, message = "Ключ файла не длиннее 100 символов")
    private String avatar;

    @JsonIgnore
    private boolean avatarProvided;

    public void setAvatar(String avatar) {
        this.avatar = avatar;
        this.avatarProvided = true;
    }
}
