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
public class GradeSheetImportResponseDto {
    List<ImportedGradeSheetDto> sheets;
}
