package ru.stankin.uits.module.events;

import jakarta.persistence.EntityManagerFactory;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import ru.stankin.uits.AbstractIntegrationTest;
import ru.stankin.uits.TestRole;
import ru.stankin.uits.common.PageResponseDto;
import ru.stankin.uits.module.events.dto.EventUserDto;
import ru.stankin.uits.module.events.dto.UserEventResponseDto;
import ru.stankin.uits.module.events.entity.UserEvent;
import ru.stankin.uits.module.events.enums.EventStatus;
import ru.stankin.uits.module.events.enums.NotificationFrequency;
import ru.stankin.uits.module.events.repository.UserEventRepository;
import ru.stankin.uits.module.user.entity.User;

import java.time.OffsetDateTime;
import java.util.LinkedHashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class UserEventIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private UserEventRepository eventRepository;

    @Autowired
    private EntityManagerFactory entityManagerFactory;

    private User teacher;
    private User colleague;
    private String teacherToken;

    @BeforeEach
    void setUp() {
        teacher = createUser("calendar_teacher", TestRole.TEACHER);
        teacher.setFirstName("Владимир");
        teacher.setLastName("Чеканин");
        userRepository.save(teacher);

        colleague = createUser("calendar_colleague", TestRole.TEACHER);
        colleague.setFirstName("Анна");
        colleague.setLastName("Абрамова");
        userRepository.save(colleague);

        teacherToken = login("calendar_teacher");
    }

    private UserEvent event(String name, String startsAt, User owner, EventStatus status, User... assigned) {
        return eventRepository.save(UserEvent.builder()
                .name(name)
                .description("Описание события " + name)
                .startedAt(OffsetDateTime.parse(startsAt))
                .endedAt(OffsetDateTime.parse(startsAt).plusHours(2))
                .color("#3F51B5")
                .owner(owner)
                .assignedUsers(new LinkedHashSet<>(Set.of(assigned)))
                .notificationFrequency(NotificationFrequency.WEEKLY)
                .status(status)
                .build());
    }

    private HttpEntity<Void> auth(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);

        return new HttpEntity<>(headers);
    }

    private PageResponseDto<UserEventResponseDto> page(String query) {
        ResponseEntity<PageResponseDto<UserEventResponseDto>> response = restTemplate.exchange(
                "/api/events" + query,
                HttpMethod.GET,
                auth(teacherToken),
                new ParameterizedTypeReference<>() {
                }
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();

        return response.getBody();
    }

    private ResponseEntity<String> get(Long id, String token) {
        return restTemplate.exchange("/api/events/" + id, HttpMethod.GET, auth(token), String.class);
    }

    private UserEventResponseDto getCard(Long id, String token) {
        ResponseEntity<UserEventResponseDto> response = restTemplate.exchange(
                "/api/events/" + id, HttpMethod.GET, auth(token), UserEventResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();

        return response.getBody();
    }

    @Test
    void listReturnsOwnedAndAssignedEvents() {
        event("Моё", "2026-09-01T10:00:00+03:00", teacher, EventStatus.NOT_STARTED);
        event("Мне назначили", "2026-09-02T10:00:00+03:00", colleague, EventStatus.NOT_STARTED, teacher);
        event("Чужое", "2026-09-03T10:00:00+03:00", colleague, EventStatus.NOT_STARTED);

        assertThat(page("").content())
                .extracting(UserEventResponseDto::getName)
                .containsExactly("Моё", "Мне назначили");
    }

    @Test
    void listIsOrderedByStart() {
        event("Позже", "2026-09-05T10:00:00+03:00", teacher, EventStatus.NOT_STARTED);
        event("Раньше", "2026-09-01T10:00:00+03:00", teacher, EventStatus.NOT_STARTED);

        assertThat(page("").content())
                .extracting(UserEventResponseDto::getName)
                .containsExactly("Раньше", "Позже");
    }

    @Test
    void listCarriesOwnerAndAssignedUsers() {
        event("Заседание", "2026-09-01T10:00:00+03:00", teacher, EventStatus.IN_PROGRESS, teacher, colleague);

        UserEventResponseDto card = page("").content().getFirst();

        assertThat(card.getDescription()).isEqualTo("Описание события Заседание");
        assertThat(card.getStartedAt()).isEqualTo(OffsetDateTime.parse("2026-09-01T10:00:00+03:00"));
        assertThat(card.getEndedAt()).isEqualTo(OffsetDateTime.parse("2026-09-01T12:00:00+03:00"));
        assertThat(card.getAllDay()).isFalse();
        assertThat(card.getColor()).isEqualTo("#3F51B5");
        assertThat(card.getStatus()).isEqualTo(EventStatus.IN_PROGRESS);
        assertThat(card.getNotificationFrequency()).isEqualTo(NotificationFrequency.WEEKLY);
        assertThat(card.getNextNotificationAt()).isNull();
        assertThat(card.getOwner().getUsername()).isEqualTo("calendar_teacher");
        assertThat(card.getAssignedUsers())
                .extracting(EventUserDto::getLastName)
                .containsExactly("Абрамова", "Чеканин");
    }

    @Test
    void listDoesNotGrowQueriesWithEventCount() {
        event("Одно", "2026-09-01T10:00:00+03:00", teacher, EventStatus.NOT_STARTED, teacher, colleague);
        long forOne = statementsForList();

        event("Два", "2026-09-02T10:00:00+03:00", teacher, EventStatus.NOT_STARTED, teacher, colleague);
        event("Три", "2026-09-03T10:00:00+03:00", teacher, EventStatus.NOT_STARTED, teacher, colleague);

        assertThat(statementsForList()).isEqualTo(forOne);
    }

    private long statementsForList() {
        Statistics statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
        statistics.setStatisticsEnabled(true);
        statistics.clear();

        page("").content().forEach(card -> assertThat(card.getAssignedUsers()).isNotNull());

        return statistics.getPrepareStatementCount();
    }

    @Test
    void statusFilterNarrowsSelection() {
        event("Не начато", "2026-09-01T10:00:00+03:00", teacher, EventStatus.NOT_STARTED);
        event("В работе", "2026-09-02T10:00:00+03:00", teacher, EventStatus.IN_PROGRESS);

        assertThat(page("?status=IN_PROGRESS").content())
                .extracting(UserEventResponseDto::getName)
                .containsExactly("В работе");
    }

    @Test
    void blankStatusIsTreatedAsNoFilter() {
        event("Не начато", "2026-09-01T10:00:00+03:00", teacher, EventStatus.NOT_STARTED);
        event("В работе", "2026-09-02T10:00:00+03:00", teacher, EventStatus.IN_PROGRESS);

        assertThat(page("?status=").content()).hasSize(2);
    }

    @Test
    void unknownStatusGives400() {
        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/events?status=POSTPONED", HttpMethod.GET, auth(teacherToken), ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void singleEventIsVisibleToOwnerAndAssignee() {
        Long id = event("Общее", "2026-09-01T10:00:00+03:00", teacher,
                EventStatus.NOT_STARTED, colleague).getId();

        assertThat(getCard(id, teacherToken).getName()).isEqualTo("Общее");
        assertThat(getCard(id, login("calendar_colleague")).getOwner().getUsername())
                .isEqualTo("calendar_teacher");
    }

    @Test
    void strangersEventGives404() {
        Long id = event("Чужое", "2026-09-01T10:00:00+03:00", colleague, EventStatus.NOT_STARTED).getId();

        assertThat(get(id, teacherToken).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void missingEventGives404() {
        assertThat(get(9999L, teacherToken).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void pageMetadataCountsEventsNotJoinRows() {
        event("Первое", "2026-09-01T10:00:00+03:00", teacher, EventStatus.NOT_STARTED, teacher, colleague);
        event("Второе", "2026-09-02T10:00:00+03:00", teacher, EventStatus.NOT_STARTED);
        event("Третье", "2026-09-03T10:00:00+03:00", teacher, EventStatus.NOT_STARTED);

        PageResponseDto<UserEventResponseDto> first = page("?page=0&size=2");

        assertThat(first.content()).extracting(UserEventResponseDto::getName)
                .containsExactly("Первое", "Второе");
        assertThat(first.totalElements()).isEqualTo(3);
        assertThat(first.totalPages()).isEqualTo(2);
    }

    @Test
    void adminSeesOnlyOwnEvents() {
        createUser("calendar_admin", TestRole.ADMIN);
        event("Чужое", "2026-09-01T10:00:00+03:00", teacher, EventStatus.NOT_STARTED);

        ResponseEntity<PageResponseDto<UserEventResponseDto>> response = restTemplate.exchange(
                "/api/events", HttpMethod.GET, auth(login("calendar_admin")),
                new ParameterizedTypeReference<>() {
                });

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().content()).isEmpty();
    }

    @Test
    void plainUserIsRejected() {
        createUser("calendar_user");
        event("Моё", "2026-09-01T10:00:00+03:00", teacher, EventStatus.NOT_STARTED);

        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/events", HttpMethod.GET, auth(login("calendar_user")), ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void anonymousIsRejected() {
        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/events", HttpMethod.GET, null, ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
