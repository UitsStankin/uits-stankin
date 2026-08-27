package ru.stankin.uits.module.achievements.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import ru.stankin.uits.common.PageResponseDto;
import ru.stankin.uits.common.exception.InvalidFileException;
import ru.stankin.uits.common.exception.InvalidRequestException;
import ru.stankin.uits.common.exception.NotFoundException;
import ru.stankin.uits.common.storage.FileStorage;
import ru.stankin.uits.module.achievements.dto.AchievementRequestDto;
import ru.stankin.uits.module.achievements.dto.AchievementResponseDto;
import ru.stankin.uits.module.achievements.entity.Achievement;
import ru.stankin.uits.module.achievements.mapper.AchievementMapper;
import ru.stankin.uits.module.achievements.repository.AchievementRepository;
import ru.stankin.uits.module.staff.entity.Teacher;
import ru.stankin.uits.module.staff.service.TeacherService;

@Slf4j
@Service
@RequiredArgsConstructor
public class AchievementService {

    private final AchievementRepository achievementRepository;
    private final AchievementMapper achievementMapper;
    private final TeacherService teacherService;
    private final FileStorage fileStorage;

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
            deleteFileAfterCommit(oldKey);
        }

        return achievementMapper.toDto(achievement);
    }

    @Transactional
    public void deleteAchievement(Long id) {
        Achievement achievement = achievementRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Достижение id=" + id + " не найдено"));
        String key = achievement.getPreviewImage();

        achievementRepository.delete(achievement);
        deleteFileAfterCommit(key);
    }

    private void prepare(AchievementRequestDto request) {
        String cleaned = Jsoup.clean(request.getContent(), Safelist.relaxed().preserveRelativeLinks(true));

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

        if (!fileStorage.exists(key)) {
            throw new InvalidFileException("Файл обложки не найден: " + key);
        }
    }

    private void deleteFileAfterCommit(String key) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                try {
                    fileStorage.delete(key);
                } catch (RuntimeException e) {
                    log.warn("Не удалось удалить файл обложки {}: файл останется в хранилище", key, e);
                }
            }
        });
    }
}
