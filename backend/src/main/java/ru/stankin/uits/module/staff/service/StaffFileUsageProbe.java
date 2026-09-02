package ru.stankin.uits.module.staff.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import ru.stankin.uits.common.storage.FileUsageProbe;
import ru.stankin.uits.module.staff.repository.HelpersEmployeeRepository;
import ru.stankin.uits.module.staff.repository.TeacherRepository;

@Component
@RequiredArgsConstructor
public class StaffFileUsageProbe implements FileUsageProbe {

    private final TeacherRepository teacherRepository;
    private final HelpersEmployeeRepository helpersEmployeeRepository;

    @Override
    public boolean uses(String key) {
        return teacherRepository.existsByAvatar(key)
                || helpersEmployeeRepository.existsByAvatar(key)
                || teacherRepository.existsByEducationContaining(key)
                || teacherRepository.existsByQualificationContaining(key);
    }
}
