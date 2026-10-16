package ru.stankin.uits.module.events.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.UriComponentsBuilder;
import ru.stankin.uits.common.PageResponseDto;
import ru.stankin.uits.module.events.dto.UserEventRequestDto;
import ru.stankin.uits.module.events.dto.UserEventResponseDto;
import ru.stankin.uits.module.events.enums.EventStatus;
import ru.stankin.uits.module.events.service.UserEventService;

import java.net.URI;

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
public class UserEventController {

    private final UserEventService eventService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public PageResponseDto<UserEventResponseDto> getEvents(
            @RequestParam(name = "status", required = false) EventStatus status,
            @PageableDefault(size = 50, sort = {"startedAt", "id"}) Pageable pageable
    ) {
        return eventService.getEvents(status, pageable);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public UserEventResponseDto getEvent(@PathVariable Long id) {
        return eventService.getEvent(id);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<UserEventResponseDto> createEvent(
            @Valid @RequestBody UserEventRequestDto request) {
        UserEventResponseDto created = eventService.createEvent(request);
        URI location = UriComponentsBuilder.fromPath("/api/events/{id}")
                .buildAndExpand(created.getId())
                .toUri();

        return ResponseEntity.created(location).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public UserEventResponseDto updateEvent(@PathVariable Long id,
                                            @Valid @RequestBody UserEventRequestDto request) {
        return eventService.updateEvent(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<Void> deleteEvent(@PathVariable Long id) {
        eventService.deleteEvent(id);

        return ResponseEntity.noContent().build();
    }
}
