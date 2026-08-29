package ru.stankin.uits.module.schedule.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import ru.stankin.uits.module.schedule.dto.ScheduleResponseDto;
import ru.stankin.uits.module.schedule.service.ScheduleImportService;
import ru.stankin.uits.module.schedule.service.ScheduleService;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ScheduleController {

    private final ScheduleImportService scheduleImportService;
    private final ScheduleService scheduleService;

    @GetMapping("/public/schedule")
    public List<ScheduleResponseDto> getSummary(
            @RequestParam(name = "teacherId", required = false) List<Long> teacherIds) {
        return scheduleService.getSummary(teacherIds);
    }

    @GetMapping("/public/teachers/{id}/schedule")
    public ScheduleResponseDto getSchedule(@PathVariable Long id) {
        return scheduleService.getByTeacherId(id);
    }

    @PostMapping("/teachers/{id}/schedule/import")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public ScheduleResponseDto importSchedule(@PathVariable Long id,
                                              @RequestParam("file") MultipartFile file) {
        return scheduleImportService.importFromPdf(id, file);
    }
}
