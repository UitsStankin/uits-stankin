package ru.stankin.uits.module.events.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.stankin.uits.common.PageResponseDto;
import ru.stankin.uits.common.exception.InvalidRequestException;
import ru.stankin.uits.common.exception.NotFoundException;
import ru.stankin.uits.module.events.dto.UserEventRequestDto;
import ru.stankin.uits.module.events.dto.UserEventResponseDto;
import ru.stankin.uits.module.events.entity.UserEvent;
import ru.stankin.uits.module.events.enums.EventStatus;
import ru.stankin.uits.module.events.mapper.UserEventMapper;
import ru.stankin.uits.module.events.repository.UserEventRepository;
import ru.stankin.uits.module.user.entity.User;
import ru.stankin.uits.module.user.service.UserService;
import ru.stankin.uits.security.SecurityUser;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class UserEventService {

    private final UserEventRepository eventRepository;
    private final UserEventMapper eventMapper;
    private final UserService userService;

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

    @Transactional
    public UserEventResponseDto createEvent(UserEventRequestDto request) {
        validateDates(request);

        UserEvent event = eventMapper.toEntity(request);
        event.setOwner(currentUser());
        event.setAssignedUsers(resolveAssigned(request.getAssignedUserIds()));

        return eventMapper.toDto(eventRepository.save(event));
    }

    @Transactional
    public UserEventResponseDto updateEvent(Long id, UserEventRequestDto request) {
        validateDates(request);

        UserEvent event = requireVisible(id);
        Set<User> assigned = resolveAssigned(request.getAssignedUserIds());
        eventMapper.updateEntity(event, request);
        event.setAssignedUsers(assigned);

        return eventMapper.toDto(event);
    }

    @Transactional
    public void deleteEvent(Long id) {
        eventRepository.delete(requireVisible(id));
    }

    private void validateDates(UserEventRequestDto request) {
        if (request.getEndedAt().isBefore(request.getStartedAt())) {
            throw new InvalidRequestException("Дата окончания не может быть раньше даты начала");
        }
    }

    private Set<User> resolveAssigned(List<Long> assignedUserIds) {
        if (assignedUserIds == null || assignedUserIds.isEmpty()) {
            return new LinkedHashSet<>();
        }

        Set<Long> unique = new LinkedHashSet<>(assignedUserIds);
        List<User> found = userService.getUsersByIds(unique);

        if (found.size() != unique.size()) {
            throw new InvalidRequestException("Среди назначенных есть несуществующие пользователи");
        }

        return new LinkedHashSet<>(found);
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
