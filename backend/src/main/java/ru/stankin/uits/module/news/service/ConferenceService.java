package ru.stankin.uits.module.news.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.stankin.uits.common.PageResponseDto;
import ru.stankin.uits.common.exception.NotFoundException;
import ru.stankin.uits.module.news.dto.ConferenceResponseDto;
import ru.stankin.uits.module.news.mapper.ConferenceMapper;
import ru.stankin.uits.module.news.repository.ConferenceRepository;

@Service
@RequiredArgsConstructor
public class ConferenceService {

    private final ConferenceRepository conferenceRepository;
    private final ConferenceMapper conferenceMapper;

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
}
