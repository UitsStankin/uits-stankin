package ru.stankin.uits.module.staff.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.UriComponentsBuilder;
import ru.stankin.uits.common.PageResponseDto;
import ru.stankin.uits.module.staff.dto.TeacherDetailsResponseDto;
import ru.stankin.uits.module.staff.dto.TeacherRequestDto;
import ru.stankin.uits.module.staff.dto.TeacherResponseDto;
import ru.stankin.uits.module.staff.service.TeacherService;

import java.net.URI;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class TeacherController {

    private final TeacherService teacherService;

    @GetMapping("/public/teachers")
    public PageResponseDto<TeacherResponseDto> getAllTeachers(
            @PageableDefault(size = 20, sort = {"lastName", "firstName", "id"}) Pageable pageable
    ) {
        return teacherService.getAllTeachers(pageable);
    }

    @GetMapping("/public/teachers/{id}")
    public TeacherDetailsResponseDto getTeacherDetails(@PathVariable Long id) {
        return teacherService.getTeacherDetails(id);
    }

    @PostMapping("/teachers")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public ResponseEntity<TeacherDetailsResponseDto> createTeacher(@Valid @RequestBody TeacherRequestDto request) {
        TeacherDetailsResponseDto created = teacherService.createTeacher(request);
        URI location = UriComponentsBuilder.fromPath("/api/teachers/{id}")
                .buildAndExpand(created.getId())
                .toUri();

        return ResponseEntity.created(location).body(created);
    }

    @PutMapping("/teachers/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public TeacherDetailsResponseDto updateTeacher(@PathVariable Long id,
                                                   @Valid @RequestBody TeacherRequestDto request) {
        return teacherService.updateTeacher(id, request);
    }

    @DeleteMapping("/teachers/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public ResponseEntity<Void> deleteTeacher(@PathVariable Long id) {
        teacherService.deleteTeacher(id);

        return ResponseEntity.noContent().build();
    }

    @GetMapping("/teachers/me")
    @PreAuthorize("hasRole('TEACHER')")
    public TeacherDetailsResponseDto getMyCard() {
        return teacherService.getMyCard();
    }

    @PutMapping("/teachers/me")
    @PreAuthorize("hasRole('TEACHER')")
    public TeacherDetailsResponseDto updateMyCard(@Valid @RequestBody TeacherRequestDto request) {
        return teacherService.updateMyCard(request);
    }
}
