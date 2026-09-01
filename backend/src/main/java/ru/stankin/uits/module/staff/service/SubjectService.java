package ru.stankin.uits.module.staff.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.stankin.uits.common.PageResponseDto;
import ru.stankin.uits.common.exception.NotFoundException;
import ru.stankin.uits.common.exception.ResourceInUseException;
import ru.stankin.uits.module.staff.dto.SubjectDto;
import ru.stankin.uits.module.staff.dto.SubjectRequestDto;
import ru.stankin.uits.module.staff.entity.Subject;
import ru.stankin.uits.module.staff.mapper.SubjectMapper;
import ru.stankin.uits.module.staff.repository.SubjectRepository;
import ru.stankin.uits.module.staff.repository.TeacherRepository;

@Service
@RequiredArgsConstructor
public class SubjectService {

    private final SubjectRepository subjectRepository;
    private final TeacherRepository teacherRepository;
    private final SubjectMapper subjectMapper;

    @Transactional(readOnly = true)
    public PageResponseDto<SubjectDto> getAllSubjects(Pageable pageable) {
        return PageResponseDto.from(subjectRepository.findAll(pageable)
                .map(subjectMapper::toDto));
    }

    @Transactional
    public SubjectDto createSubject(SubjectRequestDto request) {
        Subject subject = Subject.builder()
                .name(request.getName())
                .description(request.getDescription())
                .build();

        return subjectMapper.toDto(subjectRepository.save(subject));
    }

    @Transactional
    public SubjectDto updateSubject(Long id, SubjectRequestDto request) {
        Subject subject = findSubject(id);

        subject.setName(request.getName());
        subject.setDescription(request.getDescription());

        return subjectMapper.toDto(subject);
    }

    @Transactional
    public void deleteSubject(Long id) {
        Subject subject = findSubject(id);
        long assigned = teacherRepository.countBySubjectsId(id);

        if (assigned > 0) {
            throw new ResourceInUseException(
                    "Дисциплина назначена преподавателям (" + assigned + "), сначала снять её с карточек");
        }

        subjectRepository.delete(subject);
    }

    private Subject findSubject(Long id) {
        return subjectRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Дисциплина id=" + id + " не найдена"));
    }
}
