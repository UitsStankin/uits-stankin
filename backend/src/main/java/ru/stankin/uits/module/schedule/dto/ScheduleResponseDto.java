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
public class ScheduleResponseDto {
    Long teacherId;
    String teacherName;
    List<ScheduleLessonResponseDto> lessons;
}
