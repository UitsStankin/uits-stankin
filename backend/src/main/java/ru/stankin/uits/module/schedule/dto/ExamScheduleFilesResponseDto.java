package ru.stankin.uits.module.schedule.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExamScheduleFilesResponseDto {
    Long teacherId;
    String teacherName;
    String examScheduleGraduation;
    String examScheduleNonGraduation;
}
