package ru.stankin.uits.module.gradesheets.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import ru.stankin.uits.module.gradesheets.dto.GradeSheetImportResponseDto;
import ru.stankin.uits.module.gradesheets.service.GradeSheetImportService;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class GradeSheetController {

    private final GradeSheetImportService gradeSheetImportService;

    @PostMapping("/gradesheets/import")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public GradeSheetImportResponseDto importGradeSheets(@RequestParam("file") MultipartFile file) {
        return gradeSheetImportService.importFromWorkbook(file);
    }
}
