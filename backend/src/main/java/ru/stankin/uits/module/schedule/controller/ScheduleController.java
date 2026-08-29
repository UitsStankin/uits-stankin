package ru.stankin.uits.module.schedule.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import ru.stankin.uits.module.schedule.dto.ScheduleResponseDto;
import ru.stankin.uits.module.schedule.service.ScheduleImportService;
import ru.stankin.uits.module.schedule.service.ScheduleService;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ScheduleController {

    private final ScheduleImportService scheduleImportService;
    private final ScheduleService scheduleService;

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
