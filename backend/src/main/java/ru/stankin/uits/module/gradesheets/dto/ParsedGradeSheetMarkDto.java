package ru.stankin.uits.module.gradesheets.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ParsedGradeSheetMarkDto {
    String block;
    BigDecimal score;
    String text;
    String grade;
    String date;
    String teacher;
}
