package ru.stankin.uits.module.gradesheets.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GradeSheetMarkResponseDto {
    Long id;
    String block;
    BigDecimal score;
    String text;
    String grade;
    LocalDate date;
    String teacher;
}
