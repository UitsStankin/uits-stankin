package ru.stankin.uits.module.events.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.stankin.uits.common.PageResponseDto;
import ru.stankin.uits.common.exception.NotFoundException;
import ru.stankin.uits.module.events.dto.UserEventResponseDto;
import ru.stankin.uits.module.events.entity.UserEvent;
import ru.stankin.uits.module.events.enums.EventStatus;
import ru.stankin.uits.module.events.mapper.UserEventMapper;
import ru.stankin.uits.module.events.repository.UserEventRepository;
import ru.stankin.uits.module.user.entity.User;
import ru.stankin.uits.security.SecurityUser;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserEventService {

    private final UserEventRepository eventRepository;
    private final UserEventMapper eventMapper;

    @Transactional(readOnly = true)
    public PageResponseDto<UserEventResponseDto> getEvents(EventStatus status, Pageable pageable) {
        Page<UserEvent> page = eventRepository.findVisibleTo(currentUser().getId(), status, pageable);
        warmUpDetails(page.getContent());

        return PageResponseDto.from(page.map(eventMapper::toDto));
    }

    @Transactional(readOnly = true)
    public UserEventResponseDto getEvent(Long id) {
        return eventMapper.toDto(requireVisible(id));
    }

    private UserEvent requireVisible(Long id) {
        UserEvent event = eventRepository.findWithDetailsById(id)
                .orElseThrow(() -> notFound(id));

        if (!isVisibleTo(event, currentUser())) {
            throw notFound(id);
        }

        return event;
    }

    private boolean isVisibleTo(UserEvent event, User user) {
        if (event.getOwner().getId().equals(user.getId())) {
            return true;
        }

        return event.getAssignedUsers().stream()
                .anyMatch(assigned -> assigned.getId().equals(user.getId()));
    }

    private void warmUpDetails(List<UserEvent> events) {
        if (events.isEmpty()) {
            return;
        }

        eventRepository.findWithDetailsByIdIn(events.stream().map(UserEvent::getId).toList());
    }

    private NotFoundException notFound(Long id) {
        return new NotFoundException("Событие id=" + id + " не найдено");
    }

    private User currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            throw new IllegalStateException("No authentication found");
        }

        if (!(authentication.getPrincipal() instanceof SecurityUser securityUser)) {
            throw new IllegalStateException("Principal is not SecurityUser");
        }

        return securityUser.getUser();
    }
}
