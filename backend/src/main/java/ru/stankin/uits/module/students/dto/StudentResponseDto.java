package ru.stankin.uits.module.students.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import ru.stankin.uits.module.students.enums.EducationLevel;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentResponseDto {
    String lastName;
    String firstName;
    String patronymic;
    String group;
    EducationLevel educationLevel;
    String speciality;
    String diplomaTheme;
    Integer admissionYear;
}
