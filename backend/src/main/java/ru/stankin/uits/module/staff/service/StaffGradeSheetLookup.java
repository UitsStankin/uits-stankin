package ru.stankin.uits.module.staff.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import ru.stankin.uits.module.gradesheets.service.SubjectByNameLookup;
import ru.stankin.uits.module.gradesheets.service.TeacherByNameLookup;
import ru.stankin.uits.module.staff.entity.Subject;
import ru.stankin.uits.module.staff.entity.Teacher;
import ru.stankin.uits.module.staff.repository.SubjectRepository;
import ru.stankin.uits.module.staff.repository.TeacherRepository;

import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
class StaffGradeSheetLookup implements TeacherByNameLookup, SubjectByNameLookup {

    private final TeacherRepository teacherRepository;
    private final SubjectRepository subjectRepository;

    @Override
    public List<Teacher> byLastName(String lastName) {
        return teacherRepository.findByLastNameIgnoreCase(lastName);
    }

    @Override
    public Optional<Subject> byName(String name) {
        return subjectRepository.findByNameIgnoreCase(name);
    }
}
