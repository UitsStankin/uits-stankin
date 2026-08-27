package ru.stankin.uits.module.news.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.stankin.uits.common.PageResponseDto;
import ru.stankin.uits.common.validation.HtmlSanitizer;
import ru.stankin.uits.common.exception.InvalidFileException;
import ru.stankin.uits.common.exception.NotFoundException;
import ru.stankin.uits.common.storage.FileCleanup;
import ru.stankin.uits.common.storage.FileStorage;
import ru.stankin.uits.module.news.dto.ConferenceRequestDto;
import ru.stankin.uits.module.news.dto.ConferenceResponseDto;
import ru.stankin.uits.module.news.entity.ConferenceAnnouncement;
import ru.stankin.uits.module.news.mapper.ConferenceMapper;
import ru.stankin.uits.module.news.repository.ConferenceRepository;

import java.time.temporal.ChronoUnit;

@Service
@RequiredArgsConstructor
public class ConferenceService {

    private static final String NEWS_CATEGORY = "news";

    private final ConferenceRepository conferenceRepository;
    private final ConferenceMapper conferenceMapper;
    private final FileStorage fileStorage;
    private final FileCleanup fileCleanup;

    @Transactional(readOnly = true)
    public PageResponseDto<ConferenceResponseDto> getPublishedConferences(Pageable pageable) {
        return PageResponseDto.from(conferenceRepository.findAllByDisplayTrue(pageable)
                .map(conferenceMapper::toDto));
    }

    @Transactional(readOnly = true)
    public ConferenceResponseDto getPublishedById(Long id) {
        return conferenceRepository.findByIdAndDisplayTrue(id)
                .map(conferenceMapper::toDto)
                .orElseThrow(() -> new NotFoundException("Опубликованная конференция id=" + id + " не найдена"));
    }

    @Transactional(readOnly = true)
    public PageResponseDto<ConferenceResponseDto> getAllConferences(Pageable pageable) {
        return PageResponseDto.from(conferenceRepository.findAll(pageable)
                .map(conferenceMapper::toDto));
    }

    @Transactional(readOnly = true)
    public ConferenceResponseDto getConferenceById(Long id) {
        return conferenceRepository.findById(id)
                .map(conferenceMapper::toDto)
                .orElseThrow(() -> new NotFoundException("Конференция id=" + id + " не найдена"));
    }

    @Transactional
    public ConferenceResponseDto createConference(ConferenceRequestDto request) {
        prepare(request);
        ConferenceAnnouncement saved = conferenceRepository.save(conferenceMapper.toEntity(request));

        return conferenceMapper.toDto(saved);
    }

    @Transactional
    public ConferenceResponseDto updateConference(Long id, ConferenceRequestDto request) {
        ConferenceAnnouncement conference = conferenceRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Конференция id=" + id + " не найдена"));
        prepare(request);

        String oldKey = conference.getPreviewImage();
        conferenceMapper.updateEntity(conference, request);

        if (oldKey != null && !oldKey.equals(conference.getPreviewImage())) {
            fileCleanup.deleteAfterCommit(oldKey);
        }

        return conferenceMapper.toDto(conference);
    }

    @Transactional
    public void deleteConference(Long id) {
        ConferenceAnnouncement conference = conferenceRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Конференция id=" + id + " не найдена"));
        String key = conference.getPreviewImage();

        conferenceRepository.delete(conference);

        if (key != null) {
            fileCleanup.deleteAfterCommit(key);
        }
    }

    /**
     * Общая подготовка тела запроса для обоих путей записи. Вызывать её нужно
     * и в create, и в update: update пишет dirty checking'ом, без вызова save(),
     * и ориентир «перед сохранением» там не за что зацепить.
     */
    private void prepare(ConferenceRequestDto request) {
        if (request.getContent() != null) {
            String cleaned = HtmlSanitizer.sanitize(request.getContent());
            request.setContent(cleaned.isBlank() ? null : cleaned);
        }

        if (request.getEndDate() != null && request.getEndDate().equals(request.getStartDate())) {
            request.setEndDate(null);
        }

        if (request.getTime() != null) {
            request.setTime(request.getTime().truncatedTo(ChronoUnit.MINUTES));
        }

        validatePreviewImage(request);
    }

    private void validatePreviewImage(ConferenceRequestDto request) {
        String key = request.getPreviewImage();
        if (key != null && !fileStorage.existsInCategory(key, NEWS_CATEGORY)) {
            throw new InvalidFileException("Файл обложки не найден: " + key);
        }
    }
}
