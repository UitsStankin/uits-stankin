package ru.stankin.uits.module.schedule.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExamResponseDto {
    Long id;
    LocalDate date;
    LocalTime timeStart;
    LocalTime timeEnd;
    String group;
    String name;
    String cabinet;
    ConsultationResponseDto consultation;
}
