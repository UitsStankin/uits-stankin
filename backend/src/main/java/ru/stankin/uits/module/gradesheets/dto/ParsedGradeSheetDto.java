package ru.stankin.uits.module.gradesheets.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ParsedGradeSheetDto {

    @JsonProperty("sheet_name")
    String sheetName;

    String group;
    String discipline;
    String department;
    List<String> teachers;
    String semester;
    String direction;
    List<String> blocks;
    List<ParsedGradeSheetStudentDto> students;
    List<String> warnings;
}
