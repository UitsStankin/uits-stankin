package ru.stankin.uits.module.staff.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeacherResponseDto {
    private Long id;
    private String lastName;
    private String firstName;
    private String patronymic;
    private String position;
    private String degree;
    private String rank;
    private String avatarUrl;
}
