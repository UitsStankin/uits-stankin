package ru.stankin.uits.module.schedule.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScheduleLessonResponseDto {
    Long id;
    Integer weekNumber;
    Integer classTime;
    String group;
    String name;
    String type;
    String subgroup;
    String cabinet;
    List<ScheduleLessonDateResponseDto> dates;
}
