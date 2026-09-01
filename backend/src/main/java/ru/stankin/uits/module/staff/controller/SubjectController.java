package ru.stankin.uits.module.staff.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import ru.stankin.uits.common.PageResponseDto;
import ru.stankin.uits.module.staff.dto.SubjectDto;
import ru.stankin.uits.module.staff.dto.SubjectRequestDto;
import ru.stankin.uits.module.staff.service.SubjectService;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class SubjectController {

    private final SubjectService subjectService;

    @GetMapping("/subjects")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public PageResponseDto<SubjectDto> getAllSubjects(
            @PageableDefault(size = 20, sort = "name") Pageable pageable
    ) {
        return subjectService.getAllSubjects(pageable);
    }

    @PostMapping("/subjects")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public ResponseEntity<SubjectDto> createSubject(@Valid @RequestBody SubjectRequestDto request) {
        return ResponseEntity.status(201).body(subjectService.createSubject(request));
    }

    @PutMapping("/subjects/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public SubjectDto updateSubject(@PathVariable Long id, @Valid @RequestBody SubjectRequestDto request) {
        return subjectService.updateSubject(id, request);
    }

    @DeleteMapping("/subjects/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public ResponseEntity<Void> deleteSubject(@PathVariable Long id) {
        subjectService.deleteSubject(id);

        return ResponseEntity.noContent().build();
    }
}
