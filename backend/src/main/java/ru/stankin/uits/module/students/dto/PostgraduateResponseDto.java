package ru.stankin.uits.module.students.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PostgraduateResponseDto {
    Long id;
    Long studentId;
    String studentName;
    String speciality;
    String diplomaTheme;
    Integer admissionYear;
    Long teacherId;
    String teacherName;
}
