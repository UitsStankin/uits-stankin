package ru.stankin.uits.module.events;

import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import ru.stankin.uits.AbstractIntegrationTest;
import ru.stankin.uits.TestRole;
import ru.stankin.uits.module.events.entity.UserEvent;
import ru.stankin.uits.module.events.enums.EventStatus;
import ru.stankin.uits.module.events.enums.NotificationFrequency;
import ru.stankin.uits.module.events.repository.UserEventRepository;
import ru.stankin.uits.module.user.entity.User;

import java.time.OffsetDateTime;
import java.util.LinkedHashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@Transactional
class UserEventEntityMappingTest extends AbstractIntegrationTest {

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private UserEventRepository eventRepository;

    @Autowired
    private JdbcTemplate jdbc;

    private User owner;
    private User assignee;

    @BeforeEach
    void createParticipants() {
        owner = createUser("event_owner", TestRole.TEACHER);
        assignee = createUser("event_assignee", TestRole.TEACHER);
    }

    private UserEvent persistEvent(User... assigned) {
        UserEvent event = eventRepository.save(UserEvent.builder()
                .name("Заседание кафедры")
                .description("Обсуждение нагрузки")
                .startedAt(OffsetDateTime.parse("2026-09-01T10:00:00+03:00"))
                .endedAt(OffsetDateTime.parse("2026-09-01T11:30:00+03:00"))
                .color("#3F51B5")
                .owner(owner)
                .assignedUsers(new LinkedHashSet<>(Set.of(assigned)))
                .notificationFrequency(NotificationFrequency.WEEKLY)
                .status(EventStatus.IN_PROGRESS)
                .build());
        entityManager.flush();

        return event;
    }

    private Long linkRows(Long eventId) {
        return jdbc.queryForObject(
                "select count(*) from events_userevent_assigned_users where userevent_id = ?",
                Long.class, eventId);
    }

    @Test
    void eventIsStoredWithItsColumns() {
        Long id = persistEvent().getId();
        entityManager.clear();

        UserEvent stored = eventRepository.findWithDetailsById(id).orElseThrow();

        assertThat(stored.getName()).isEqualTo("Заседание кафедры");
        assertThat(stored.getDescription()).isEqualTo("Обсуждение нагрузки");
        assertThat(stored.getStartedAt()).isEqualTo(OffsetDateTime.parse("2026-09-01T10:00:00+03:00"));
        assertThat(stored.getEndedAt()).isEqualTo(OffsetDateTime.parse("2026-09-01T11:30:00+03:00"));
        assertThat(stored.isAllDay()).isFalse();
        assertThat(stored.getColor()).isEqualTo("#3F51B5");
        assertThat(stored.getOwner().getId()).isEqualTo(owner.getId());
        assertThat(stored.isStartNotified()).isFalse();
        assertThat(stored.getNotificationFrequency()).isEqualTo(NotificationFrequency.WEEKLY);
        assertThat(stored.getStatus()).isEqualTo(EventStatus.IN_PROGRESS);
    }

    @Test
    void enumsAreStoredAsNames() {
        Long id = persistEvent().getId();

        assertThat(jdbc.queryForObject(
                "select notification_frequency from events_userevent where id = ?", String.class, id))
                .isEqualTo("WEEKLY");
        assertThat(jdbc.queryForObject(
                "select status from events_userevent where id = ?", String.class, id))
                .isEqualTo("IN_PROGRESS");
    }

    @Test
    void nextNotificationStaysNullUntilSchedulerMovesIt() {
        UserEvent event = persistEvent();

        event.setName("Заседание кафедры, перенос");
        eventRepository.save(event);
        entityManager.flush();
        entityManager.clear();

        assertThat(eventRepository.findWithDetailsById(event.getId()).orElseThrow()
                .getNextNotificationAt()).isNull();
    }

    @Test
    void assignedUsersGoToTheLinkTable() {
        UserEvent event = persistEvent(owner, assignee);
        entityManager.clear();

        assertThat(linkRows(event.getId())).isEqualTo(2);
        assertThat(eventRepository.findWithDetailsById(event.getId()).orElseThrow().getAssignedUsers())
                .extracting(User::getUsername)
                .containsExactlyInAnyOrder("event_owner", "event_assignee");
    }

    @Test
    void deletingEventClearsLinksAndKeepsUsers() {
        UserEvent event = persistEvent(owner, assignee);

        eventRepository.delete(event);
        entityManager.flush();

        assertThat(linkRows(event.getId())).isZero();
        assertThat(userRepository.findById(assignee.getId())).isPresent();
    }

    @Test
    void deletingOwnerRemovesEvent() {
        UserEvent event = persistEvent(assignee);

        jdbc.update("delete from users_user where id = ?", owner.getId());

        assertThat(eventRepository.existsById(event.getId())).isFalse();
    }

    @Test
    void deletingAssigneeRemovesOnlyTheLink() {
        UserEvent event = persistEvent(assignee);

        jdbc.update("delete from users_user where id = ?", assignee.getId());
        entityManager.clear();

        assertThat(eventRepository.existsById(event.getId())).isTrue();
        assertThat(linkRows(event.getId())).isZero();
    }

    @Test
    void sameUserCannotBeAssignedTwice() {
        UserEvent event = persistEvent(assignee);

        assertThat(jdbc.update("insert into events_userevent_assigned_users (userevent_id, user_id) "
                        + "values (?, ?) on conflict do nothing",
                event.getId(), assignee.getId())).isZero();
    }
}
