package ru.stankin.uits.module.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserAdminResponseDto {
    private Long id;
    private String username;
    private String firstName;
    private String lastName;
    private String email;
    private String avatarUrl;

    private boolean teacher;
    private boolean moderator;
    private boolean superuser;
    private boolean active;

    private OffsetDateTime lastLogin;
    private OffsetDateTime dateJoined;
}
