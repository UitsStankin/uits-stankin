package ru.stankin.uits.module.gradesheets.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import ru.stankin.uits.common.PageResponseDto;
import ru.stankin.uits.module.gradesheets.dto.GradeSheetDetailsResponseDto;
import ru.stankin.uits.module.gradesheets.dto.GradeSheetImportResponseDto;
import ru.stankin.uits.module.gradesheets.dto.GradeSheetResponseDto;
import ru.stankin.uits.module.gradesheets.service.GradeSheetImportService;
import ru.stankin.uits.module.gradesheets.service.GradeSheetService;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class GradeSheetController {

    private final GradeSheetImportService gradeSheetImportService;
    private final GradeSheetService gradeSheetService;

    @PostMapping("/gradesheets/import")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public GradeSheetImportResponseDto importGradeSheets(@RequestParam("file") MultipartFile file) {
        return gradeSheetImportService.importFromWorkbook(file);
    }

    @GetMapping("/gradesheets")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public PageResponseDto<GradeSheetResponseDto> getGradeSheets(
            @RequestParam(name = "group", required = false) String group,
            @RequestParam(name = "discipline", required = false) String discipline,
            @RequestParam(name = "semester", required = false) String semester,
            @PageableDefault(size = 20, sort = {"importedAt", "id"}, direction = Sort.Direction.DESC)
            Pageable pageable
    ) {
        return gradeSheetService.getGradeSheets(group, discipline, semester, pageable);
    }

    @GetMapping("/gradesheets/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public GradeSheetDetailsResponseDto getGradeSheet(@PathVariable Long id) {
        return gradeSheetService.getGradeSheet(id);
    }
}
