package ru.stankin.uits.module.news.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import ru.stankin.uits.common.PageResponseDto;
import ru.stankin.uits.module.news.dto.ConferenceResponseDto;
import ru.stankin.uits.module.news.service.ConferenceService;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ConferenceController {

    private final ConferenceService conferenceService;

    @GetMapping("/public/conferences")
    public PageResponseDto<ConferenceResponseDto> getConferences(
            @PageableDefault(size = 20, sort = {"createdAt", "id"}, direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return conferenceService.getPublishedConferences(pageable);
    }

    @GetMapping("/public/conferences/{id}")
    public ConferenceResponseDto getPublishedConference(@PathVariable Long id) {
        return conferenceService.getPublishedById(id);
    }

    @GetMapping("/conferences")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public PageResponseDto<ConferenceResponseDto> getAllConferences(
            @PageableDefault(size = 20, sort = {"createdAt", "id"}, direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return conferenceService.getAllConferences(pageable);
    }

    @GetMapping("/conferences/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public ConferenceResponseDto getConferenceById(@PathVariable Long id) {
        return conferenceService.getConferenceById(id);
    }
}
