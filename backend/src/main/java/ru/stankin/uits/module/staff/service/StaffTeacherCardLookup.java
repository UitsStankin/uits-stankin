package ru.stankin.uits.module.staff.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import ru.stankin.uits.module.staff.entity.Teacher;
import ru.stankin.uits.module.staff.repository.TeacherRepository;
import ru.stankin.uits.module.user.service.TeacherCardLookup;

import java.util.Optional;

@Component
@RequiredArgsConstructor
class StaffTeacherCardLookup implements TeacherCardLookup {

    private final TeacherRepository teacherRepository;

    @Override
    public Optional<Long> cardIdByUserId(long userId) {
        return teacherRepository.findByUserId(userId).map(Teacher::getId);
    }
}
