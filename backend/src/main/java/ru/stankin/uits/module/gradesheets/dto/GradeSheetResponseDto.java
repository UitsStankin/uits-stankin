package ru.stankin.uits.module.gradesheets.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GradeSheetResponseDto {
    Long id;
    String discipline;
    String group;
    String semester;
    String department;
    String direction;
    String teachers;
    Long teacherId;
    Long subjectId;
    int studentCount;
    String importedFileName;
    OffsetDateTime importedAt;
}
