package ru.stankin.uits.module.staff.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ru.stankin.uits.common.PageResponseDto;
import ru.stankin.uits.module.staff.dto.TeacherResponseDto;
import ru.stankin.uits.module.staff.service.TeacherService;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class TeacherController {

    private final TeacherService teacherService;

    @GetMapping("/public/teachers")
    public PageResponseDto<TeacherResponseDto> getAllTeachers(
            @PageableDefault(size = 20, sort = {"user.lastName", "user.firstName", "id"}) Pageable pageable
    ) {
        return teacherService.getAllTeachers(pageable);
    }
}
