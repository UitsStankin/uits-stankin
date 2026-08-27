package ru.stankin.uits.module.staff.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import ru.stankin.uits.common.PageResponseDto;
import ru.stankin.uits.common.exception.InvalidFileException;
import ru.stankin.uits.common.exception.InvalidRequestException;
import ru.stankin.uits.common.exception.NotFoundException;
import ru.stankin.uits.common.storage.FileStorage;
import ru.stankin.uits.module.staff.dto.TeacherDetailsResponseDto;
import ru.stankin.uits.module.staff.dto.TeacherRequestDto;
import ru.stankin.uits.module.staff.dto.TeacherResponseDto;
import ru.stankin.uits.module.staff.entity.Subject;
import ru.stankin.uits.module.staff.entity.Teacher;
import ru.stankin.uits.module.staff.mapper.TeacherMapper;
import ru.stankin.uits.module.staff.repository.SubjectRepository;
import ru.stankin.uits.module.staff.repository.TeacherRepository;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TeacherService {

    private final TeacherRepository teacherRepository;
    private final SubjectRepository subjectRepository;
    private final TeacherMapper teacherMapper;
    private final FileStorage fileStorage;

    @Transactional(readOnly = true)
    public PageResponseDto<TeacherResponseDto> getAllTeachers(Pageable pageable) {
        return PageResponseDto.from(teacherRepository.findAll(pageable)
                .map(teacherMapper::toDto));
    }

    @Transactional(readOnly = true)
    public TeacherDetailsResponseDto getTeacherDetails(Long id) {
        return teacherRepository.findById(id)
                .map(teacherMapper::toDetailsDto)
                .orElseThrow(() -> new NotFoundException("Преподаватель id=" + id + " не найден"));
    }

    @Transactional(readOnly = true)
    public Teacher getTeacherEntity(Long id) {
        return teacherRepository.findById(id)
                .orElseThrow(() -> new InvalidRequestException("Преподаватель не найден: id=" + id));
    }

    @Transactional
    public TeacherDetailsResponseDto createTeacher(TeacherRequestDto request) {
        validateAvatar(request);
        Teacher teacher = teacherMapper.toEntity(request);
        teacher.getSubjects().addAll(resolveSubjects(request.getSubjectIds()));

        return teacherMapper.toDetailsDto(teacherRepository.save(teacher));
    }

    @Transactional
    public TeacherDetailsResponseDto updateTeacher(Long id, TeacherRequestDto request) {
        Teacher teacher = teacherRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Преподаватель id=" + id + " не найден"));

        applyUpdate(teacher, request);
        teacher.getSubjects().clear();
        teacher.getSubjects().addAll(resolveSubjects(request.getSubjectIds()));

        return teacherMapper.toDetailsDto(teacher);
    }

    @Transactional
    public void deleteTeacher(Long id) {
        Teacher teacher = teacherRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Преподаватель id=" + id + " не найден"));
        String avatarKey = teacher.getAvatar();

        teacherRepository.delete(teacher);

        if (avatarKey != null) {
            deleteFileAfterCommit(avatarKey);
        }
    }

    @Transactional(readOnly = true)
    public TeacherDetailsResponseDto getMyCard() {
        return teacherMapper.toDetailsDto(findMyCard());
    }

    @Transactional
    public TeacherDetailsResponseDto updateMyCard(TeacherRequestDto request) {
        Teacher teacher = findMyCard();
        applyUpdate(teacher, request);

        return teacherMapper.toDetailsDto(teacher);
    }

    private void applyUpdate(Teacher teacher, TeacherRequestDto request) {
        validateAvatar(request);
        String oldAvatarKey = teacher.getAvatar();
        teacherMapper.updateEntity(teacher, request);

        if (oldAvatarKey != null && !oldAvatarKey.equals(teacher.getAvatar())) {
            deleteFileAfterCommit(oldAvatarKey);
        }
    }

    private Teacher findMyCard() {
        return teacherRepository.findByUserUsername(currentUsername())
                .orElseThrow(() -> new NotFoundException("Карточка преподавателя не привязана к учётной записи"));
    }

    private String currentUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            throw new IllegalStateException("No authentication found");
        }

        return authentication.getName();
    }

    private Set<Subject> resolveSubjects(List<Long> subjectIds) {
        if (subjectIds == null || subjectIds.isEmpty()) {
            return new HashSet<>();
        }

        List<Subject> found = subjectRepository.findAllById(subjectIds);
        Set<Long> foundIds = found.stream().map(Subject::getId).collect(Collectors.toSet());
        Set<Long> missing = subjectIds.stream()
                .filter(id -> !foundIds.contains(id))
                .collect(Collectors.toSet());

        if (!missing.isEmpty()) {
            throw new InvalidRequestException("Дисциплины не найдены: " + missing);
        }

        return new HashSet<>(found);
    }

    private void validateAvatar(TeacherRequestDto request) {
        String key = request.getAvatar();
        if (key != null && !fileStorage.exists(key)) {
            throw new InvalidFileException("Файл аватара не найден: " + key);
        }
    }

    private void deleteFileAfterCommit(String key) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                fileStorage.delete(key);
            }
        });
    }
}
