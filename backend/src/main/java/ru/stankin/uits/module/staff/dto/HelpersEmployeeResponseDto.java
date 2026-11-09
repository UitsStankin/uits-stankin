package ru.stankin.uits.module.staff.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HelpersEmployeeResponseDto {
    private Long id;
    private String lastName;
    private String firstName;
    private String patronymic;
    private String position;
    private String avatar;
    private String avatarUrl;
}
