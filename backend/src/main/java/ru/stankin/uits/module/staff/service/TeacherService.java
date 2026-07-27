package ru.stankin.uits.module.staff.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.stankin.uits.common.PageResponseDto;
import ru.stankin.uits.module.staff.dto.TeacherResponseDto;
import ru.stankin.uits.module.staff.mapper.TeacherMapper;
import ru.stankin.uits.module.staff.repository.TeacherRepository;

@Service
@RequiredArgsConstructor
public class TeacherService {

    private final TeacherRepository teacherRepository;
    private final TeacherMapper teacherMapper;

    @Transactional(readOnly = true)
    public PageResponseDto<TeacherResponseDto> getAllTeachers(Pageable pageable) {
        return PageResponseDto.from(teacherRepository.findAll(pageable)
                .map(teacherMapper::toDto));
    }
}