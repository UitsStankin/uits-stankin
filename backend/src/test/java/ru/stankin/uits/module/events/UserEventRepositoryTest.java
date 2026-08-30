package ru.stankin.uits.module.events;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.transaction.annotation.Transactional;
import ru.stankin.uits.AbstractIntegrationTest;
import ru.stankin.uits.TestRole;
import ru.stankin.uits.module.events.entity.UserEvent;
import ru.stankin.uits.module.events.enums.EventStatus;
import ru.stankin.uits.module.events.repository.UserEventRepository;
import ru.stankin.uits.module.user.entity.User;

import java.time.OffsetDateTime;
import java.util.LinkedHashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@Transactional
class UserEventRepositoryTest extends AbstractIntegrationTest {

    private static final Sort BY_START = Sort.by("startedAt", "id");
    private static final Pageable FIRST_PAGE = PageRequest.of(0, 20, BY_START);

    @Autowired
    private UserEventRepository eventRepository;

    private User teacher;
    private User colleague;
    private User stranger;

    @BeforeEach
    void createParticipants() {
        teacher = createUser("events_teacher", TestRole.TEACHER);
        colleague = createUser("events_colleague", TestRole.TEACHER);
        stranger = createUser("events_stranger", TestRole.TEACHER);
    }

    private UserEvent event(String name, String startsAt, User owner, EventStatus status, User... assigned) {
        return eventRepository.save(UserEvent.builder()
                .name(name)
                .startedAt(OffsetDateTime.parse(startsAt))
                .endedAt(OffsetDateTime.parse(startsAt).plusHours(1))
                .owner(owner)
                .assignedUsers(new LinkedHashSet<>(Set.of(assigned)))
                .status(status)
                .build());
    }

    private UserEvent event(String name, User owner, EventStatus status, User... assigned) {
        return event(name, "2026-09-01T10:00:00+03:00", owner, status, assigned);
    }

    @Test
    void ownedAndAssignedEventsAreVisible() {
        event("Моё", teacher, EventStatus.NOT_STARTED);
        event("Мне назначили", colleague, EventStatus.NOT_STARTED, teacher);
        event("Чужое", colleague, EventStatus.NOT_STARTED, stranger);

        assertThat(eventRepository.findVisibleTo(teacher.getId(), null, FIRST_PAGE))
                .extracting(UserEvent::getName)
                .containsExactlyInAnyOrder("Моё", "Мне назначили");
    }

    @Test
    void pageCountsEventsNotJoinRows() {
        event("Первое", "2026-09-01T10:00:00+03:00", teacher, EventStatus.NOT_STARTED,
                teacher, colleague, stranger);
        event("Второе", "2026-09-02T10:00:00+03:00", teacher, EventStatus.NOT_STARTED);
        event("Третье", "2026-09-03T10:00:00+03:00", teacher, EventStatus.NOT_STARTED);

        Page<UserEvent> page = eventRepository.findVisibleTo(
                teacher.getId(), null, PageRequest.of(0, 2, BY_START));

        assertThat(page.getContent())
                .extracting(UserEvent::getName)
                .containsExactly("Первое", "Второе");
        assertThat(page.getTotalElements()).isEqualTo(3);
    }

    @Test
    void secondPageDoesNotLoseEvents() {
        event("Первое", "2026-09-01T10:00:00+03:00", teacher, EventStatus.NOT_STARTED,
                teacher, colleague, stranger);
        event("Второе", "2026-09-02T10:00:00+03:00", teacher, EventStatus.NOT_STARTED);
        event("Третье", "2026-09-03T10:00:00+03:00", teacher, EventStatus.NOT_STARTED);

        assertThat(eventRepository.findVisibleTo(teacher.getId(), null, PageRequest.of(1, 2, BY_START)))
                .extracting(UserEvent::getName)
                .containsExactly("Третье");
    }

    @Test
    void statusFilterSelectsOnlyThatStatus() {
        event("Не начато", teacher, EventStatus.NOT_STARTED);
        event("В работе", teacher, EventStatus.IN_PROGRESS);
        event("Завершено", teacher, EventStatus.COMPLETED);

        assertThat(eventRepository.findVisibleTo(teacher.getId(), EventStatus.IN_PROGRESS, FIRST_PAGE))
                .extracting(UserEvent::getName)
                .containsExactly("В работе");
    }

    @Test
    void nullStatusMeansNoFilter() {
        event("Не начато", teacher, EventStatus.NOT_STARTED);
        event("В работе", teacher, EventStatus.IN_PROGRESS);

        assertThat(eventRepository.findVisibleTo(teacher.getId(), null, FIRST_PAGE)).hasSize(2);
    }

    @Test
    void strangerSeesNothing() {
        event("Моё", teacher, EventStatus.NOT_STARTED, colleague);

        assertThat(eventRepository.findVisibleTo(stranger.getId(), null, FIRST_PAGE)).isEmpty();
    }
}
