package ru.stankin.uits.module.schedule.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import ru.stankin.uits.module.schedule.dto.ScheduleResponseDto;
import ru.stankin.uits.module.schedule.service.ScheduleImportService;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ScheduleController {

    private final ScheduleImportService scheduleImportService;

    @PostMapping("/teachers/{id}/schedule/import")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public ScheduleResponseDto importSchedule(@PathVariable Long id,
                                              @RequestParam("file") MultipartFile file) {
        return scheduleImportService.importFromPdf(id, file);
    }
}
