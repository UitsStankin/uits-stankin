package ru.stankin.uits.module.events.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import ru.stankin.uits.common.PageResponseDto;
import ru.stankin.uits.module.events.dto.UserEventResponseDto;
import ru.stankin.uits.module.events.enums.EventStatus;
import ru.stankin.uits.module.events.service.UserEventService;

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
}
