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
public class ParsedGradeSheetStudentDto {

    Integer number;

    @JsonProperty("last_name")
    String lastName;

    @JsonProperty("first_name")
    String firstName;

    String patronymic;
    List<ParsedGradeSheetMarkDto> marks;
}
