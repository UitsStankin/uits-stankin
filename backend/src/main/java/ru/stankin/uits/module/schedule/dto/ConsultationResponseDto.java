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
public class ConsultationResponseDto {
    LocalDate date;
    LocalTime time;
    String cabinet;
}
