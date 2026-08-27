package ru.stankin.uits.module.news.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import ru.stankin.uits.common.PageResponseDto;
import ru.stankin.uits.module.news.dto.ConferenceRequestDto;
import ru.stankin.uits.module.news.dto.ConferenceResponseDto;
import ru.stankin.uits.module.news.service.ConferenceService;

import java.net.URI;

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

    @PostMapping("/conferences")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public ResponseEntity<ConferenceResponseDto> createConference(@Valid @RequestBody ConferenceRequestDto request) {
        ConferenceResponseDto created = conferenceService.createConference(request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.getId())
                .toUri();

        return ResponseEntity.created(location).body(created);
    }

    @PutMapping("/conferences/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public ConferenceResponseDto updateConference(@PathVariable Long id,
                                                  @Valid @RequestBody ConferenceRequestDto request) {
        return conferenceService.updateConference(id, request);
    }

    @DeleteMapping("/conferences/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public ResponseEntity<Void> deleteConference(@PathVariable Long id) {
        conferenceService.deleteConference(id);

        return ResponseEntity.noContent().build();
    }
}
