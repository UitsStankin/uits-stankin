package ru.stankin.uits.module.achievements.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.stankin.uits.common.PageResponseDto;
import ru.stankin.uits.common.validation.HtmlSanitizer;
import ru.stankin.uits.common.exception.InvalidFileException;
import ru.stankin.uits.common.exception.InvalidRequestException;
import ru.stankin.uits.common.exception.NotFoundException;
import ru.stankin.uits.common.storage.FileCleanup;
import ru.stankin.uits.common.storage.FileStorage;
import ru.stankin.uits.module.achievements.dto.AchievementRequestDto;
import ru.stankin.uits.module.achievements.dto.AchievementResponseDto;
import ru.stankin.uits.module.achievements.entity.Achievement;
import ru.stankin.uits.module.achievements.mapper.AchievementMapper;
import ru.stankin.uits.module.achievements.repository.AchievementRepository;
import ru.stankin.uits.module.staff.entity.Teacher;
import ru.stankin.uits.module.staff.service.TeacherService;

@Service
@RequiredArgsConstructor
public class AchievementService {

    private static final String ACHIEVEMENT_CATEGORY = "achievements";

    private final AchievementRepository achievementRepository;
    private final AchievementMapper achievementMapper;
    private final TeacherService teacherService;
    private final FileStorage fileStorage;
    private final FileCleanup fileCleanup;

    @Transactional(readOnly = true)
    public PageResponseDto<AchievementResponseDto> getPublishedAchievements(Pageable pageable) {
        return PageResponseDto.from(achievementRepository.findAllByDisplayTrue(pageable)
                .map(achievementMapper::toDto));
    }

    @Transactional(readOnly = true)
    public AchievementResponseDto getPublishedById(Long id) {
        return achievementRepository.findByIdAndDisplayTrue(id)
                .map(achievementMapper::toDto)
                .orElseThrow(() -> new NotFoundException("Опубликованное достижение id=" + id + " не найдено"));
    }

    @Transactional(readOnly = true)
    public PageResponseDto<AchievementResponseDto> getPublishedByTeacher(Long teacherId, Pageable pageable) {
        return PageResponseDto.from(achievementRepository.findAllByTeacherIdAndDisplayTrue(teacherId, pageable)
                .map(achievementMapper::toDto));
    }

    @Transactional(readOnly = true)
    public PageResponseDto<AchievementResponseDto> getAllAchievements(Pageable pageable) {
        return PageResponseDto.from(achievementRepository.findAll(pageable)
                .map(achievementMapper::toDto));
    }

    @Transactional(readOnly = true)
    public AchievementResponseDto getAchievementById(Long id) {
        return achievementRepository.findById(id)
                .map(achievementMapper::toDto)
                .orElseThrow(() -> new NotFoundException("Достижение id=" + id + " не найдено"));
    }

    @Transactional
    public AchievementResponseDto createAchievement(AchievementRequestDto request) {
        prepare(request);
        Achievement achievement = achievementMapper.toEntity(request);
        achievement.setTeacher(resolveTeacher(request.getTeacherId()));

        return achievementMapper.toDto(achievementRepository.save(achievement));
    }

    @Transactional
    public AchievementResponseDto updateAchievement(Long id, AchievementRequestDto request) {
        Achievement achievement = achievementRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Достижение id=" + id + " не найдено"));
        prepare(request);
        Teacher teacher = resolveTeacher(request.getTeacherId());

        String oldKey = achievement.getPreviewImage();
        achievementMapper.updateEntity(achievement, request);
        achievement.setTeacher(teacher);

        if (!oldKey.equals(achievement.getPreviewImage())) {
            fileCleanup.deleteAfterCommit(oldKey);
        }

        return achievementMapper.toDto(achievement);
    }

    @Transactional
    public void deleteAchievement(Long id) {
        Achievement achievement = achievementRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Достижение id=" + id + " не найдено"));
        String key = achievement.getPreviewImage();

        achievementRepository.delete(achievement);
        fileCleanup.deleteAfterCommit(key);
    }

    private void prepare(AchievementRequestDto request) {
        String cleaned = HtmlSanitizer.sanitize(request.getContent());

        if (cleaned.isBlank()) {
            throw new InvalidRequestException("Содержание состоит только из запрещённой разметки");
        }

        request.setContent(cleaned);
        validatePreviewImage(request);
    }

    private Teacher resolveTeacher(Long teacherId) {
        if (teacherId == null) {
            return null;
        }

        return teacherService.getTeacherEntity(teacherId);
    }

    private void validatePreviewImage(AchievementRequestDto request) {
        String key = request.getPreviewImage();

        if (!fileStorage.existsInCategory(key, ACHIEVEMENT_CATEGORY)) {
            throw new InvalidFileException("Файл обложки не найден: " + key);
        }
    }
}
