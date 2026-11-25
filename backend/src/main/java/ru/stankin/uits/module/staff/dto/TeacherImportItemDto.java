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
public class TeacherImportItemDto {
    int rowNumber;
    String fullName;
    String position;
    TeacherImportAction action;
    Long teacherId;
    String reason;
    List<String> errors;
    List<String> warnings;
}
