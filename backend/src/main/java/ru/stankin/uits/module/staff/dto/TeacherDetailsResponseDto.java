package ru.stankin.uits.module.staff.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeacherDetailsResponseDto {
    private Long id;
    private Long userId;
    private String lastName;
    private String firstName;
    private String patronymic;
    private String position;
    private String degree;
    private String rank;
    private String avatar;
    private String avatarUrl;
    private String phoneNumber;
    private String email;
    private String messenger;
    private Integer experience;
    private Integer professionalExperience;
    private String education;
    private String qualification;
    private String bio;
    private String examScheduleGraduation;
    private String examScheduleNonGraduation;
    private List<SubjectDto> subjects;
}
