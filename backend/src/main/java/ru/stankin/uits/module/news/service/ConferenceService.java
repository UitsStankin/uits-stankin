package ru.stankin.uits.module.news.service;

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
import ru.stankin.uits.common.exception.NotFoundException;
import ru.stankin.uits.common.storage.FileStorage;
import ru.stankin.uits.module.news.dto.ConferenceRequestDto;
import ru.stankin.uits.module.news.dto.ConferenceResponseDto;
import ru.stankin.uits.module.news.entity.ConferenceAnnouncement;
import ru.stankin.uits.module.news.mapper.ConferenceMapper;
import ru.stankin.uits.module.news.repository.ConferenceRepository;

import java.time.temporal.ChronoUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class ConferenceService {

    private final ConferenceRepository conferenceRepository;
    private final ConferenceMapper conferenceMapper;
    private final FileStorage fileStorage;

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
            deleteFileAfterCommit(oldKey);
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
            deleteFileAfterCommit(key);
        }
    }

    /**
     * Общая подготовка тела запроса для обоих путей записи. Вызывать её нужно
     * и в create, и в update: update пишет dirty checking'ом, без вызова save(),
     * и ориентир «перед сохранением» там не за что зацепить.
     */
    private void prepare(ConferenceRequestDto request) {
        if (request.getContent() != null) {
            String cleaned = Jsoup.clean(request.getContent(), Safelist.relaxed().preserveRelativeLinks(true));
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
        if (key != null && !fileStorage.exists(key)) {
            throw new InvalidFileException("Файл обложки не найден: " + key);
        }
    }

    /**
     * Откладывает удаление файла до успешного коммита: диск транзакцию не откатывает.
     * Сбой самой уборки не пробрасывается: коммит уже прошёл, и исключение отсюда
     * превратило бы удавшийся запрос в 500. Файл остаётся сиротой — это забота T-31.
     */
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
