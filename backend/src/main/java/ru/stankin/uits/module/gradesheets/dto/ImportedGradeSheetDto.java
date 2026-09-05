package ru.stankin.uits.module.gradesheets.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImportedGradeSheetDto {
    Long id;
    String sheetName;
    String discipline;
    String group;
    String semester;
    int studentCount;
    List<String> warnings;
}
