package ru.stankin.uits.module.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDirectoryDto {
    private Long id;
    private String lastName;
    private String firstName;
}
