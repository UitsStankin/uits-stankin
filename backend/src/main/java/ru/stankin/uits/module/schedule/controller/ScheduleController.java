package ru.stankin.uits.module.schedule.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import ru.stankin.uits.module.schedule.dto.ExamScheduleFilesResponseDto;
import ru.stankin.uits.module.schedule.dto.ExamScheduleResponseDto;
import ru.stankin.uits.module.schedule.dto.ScheduleResponseDto;
import ru.stankin.uits.module.schedule.service.ExamScheduleService;
import ru.stankin.uits.module.schedule.service.ScheduleImportService;
import ru.stankin.uits.module.schedule.service.ScheduleService;
import ru.stankin.uits.module.staff.enums.ExamScheduleType;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ScheduleController {

    private final ScheduleImportService scheduleImportService;
    private final ScheduleService scheduleService;
    private final ExamScheduleService examScheduleService;

    @GetMapping("/public/schedule")
    public List<ScheduleResponseDto> getSummary(
            @RequestParam(name = "teacherId", required = false) List<Long> teacherIds) {
        return scheduleService.getSummary(teacherIds);
    }

    @GetMapping("/public/exams/files")
    public List<ExamScheduleFilesResponseDto> getExamScheduleFiles(
            @RequestParam(name = "type", required = false) ExamScheduleType type) {
        return scheduleService.getExamScheduleFiles(type);
    }

    @GetMapping("/public/teachers/{id}/schedule")
    public ScheduleResponseDto getSchedule(@PathVariable Long id) {
        return scheduleService.getByTeacherId(id);
    }

    @GetMapping("/public/exams")
    public List<ExamScheduleResponseDto> getExamsSummary(
            @RequestParam(name = "teacherId", required = false) List<Long> teacherIds,
            @RequestParam(name = "group", required = false) String group) {
        return examScheduleService.getSummary(teacherIds, group);
    }

    @GetMapping("/public/teachers/{id}/exams")
    public ExamScheduleResponseDto getExams(@PathVariable Long id) {
        return examScheduleService.getByTeacherId(id);
    }

    @PostMapping("/teachers/{id}/exams/import")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public ExamScheduleResponseDto importExamSchedule(@PathVariable Long id,
                                                      @RequestParam("file") MultipartFile file) {
        return scheduleImportService.importExamsFromPdf(id, file);
    }

    @PostMapping("/teachers/{id}/schedule/import")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public ScheduleResponseDto importSchedule(@PathVariable Long id,
                                              @RequestParam("file") MultipartFile file) {
        return scheduleImportService.importFromPdf(id, file);
    }
}
