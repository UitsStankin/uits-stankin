package ru.stankin.uits.module.staff.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TeacherResponseDto {
    private Long id;

    // fields from users_user
    private Long userId;
    private String firstName;
    private String lastName;
    private String avatar;
    private String email;

    // teacher fields
    private String degree;
    private String rank;
    private String position;
    private String bio;
    private String phoneNumber;
    private String education;
    private String qualification;
    private Integer professionalExperience;
}