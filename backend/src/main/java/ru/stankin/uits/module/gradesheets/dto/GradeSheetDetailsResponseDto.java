package ru.stankin.uits.module.gradesheets.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GradeSheetDetailsResponseDto {
    Long id;
    String discipline;
    String group;
    String semester;
    String department;
    String direction;
    String teachers;
    Long teacherId;
    Long subjectId;
    String importedFileName;
    OffsetDateTime importedAt;
    List<String> blocks;
    List<GradeSheetStudentResponseDto> students;
}
