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
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import ru.stankin.uits.AbstractIntegrationTest;
import ru.stankin.uits.TestRole;
import ru.stankin.uits.common.PageResponseDto;
import ru.stankin.uits.module.events.dto.EventUserDto;
import ru.stankin.uits.module.events.dto.UserEventRequestDto;
import ru.stankin.uits.module.events.dto.UserEventResponseDto;
import ru.stankin.uits.module.events.entity.UserEvent;
import ru.stankin.uits.module.events.enums.EventStatus;
import ru.stankin.uits.module.events.enums.NotificationFrequency;
import ru.stankin.uits.module.events.repository.UserEventRepository;
import ru.stankin.uits.module.user.entity.User;

import java.time.OffsetDateTime;
import java.util.LinkedHashSet;
import java.util.List;
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

    private UserEventRequestDto.UserEventRequestDtoBuilder request() {
        return UserEventRequestDto.builder()
                .name("Заседание кафедры")
                .description("Обсуждение нагрузки")
                .startedAt(OffsetDateTime.parse("2026-09-01T10:00:00+03:00"))
                .endedAt(OffsetDateTime.parse("2026-09-01T11:30:00+03:00"))
                .allDay(false)
                .color("#3F51B5")
                .status(EventStatus.NOT_STARTED)
                .notificationFrequency(NotificationFrequency.WEEKLY);
    }

    private HttpHeaders authJson(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);

        return headers;
    }

    private ResponseEntity<String> post(Object body, String token) {
        return restTemplate.exchange("/api/events", HttpMethod.POST,
                new HttpEntity<>(body, authJson(token)), String.class);
    }

    private ResponseEntity<String> put(Long id, Object body, String token) {
        return restTemplate.exchange("/api/events/" + id, HttpMethod.PUT,
                new HttpEntity<>(body, authJson(token)), String.class);
    }

    private ResponseEntity<String> delete(Long id, String token) {
        return restTemplate.exchange("/api/events/" + id, HttpMethod.DELETE,
                auth(token), String.class);
    }

    private UserEventResponseDto created(UserEventRequestDto body, String token) {
        ResponseEntity<UserEventResponseDto> response = restTemplate.exchange(
                "/api/events", HttpMethod.POST,
                new HttpEntity<>(body, authJson(token)), UserEventResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();

        return response.getBody();
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

    @Test
    void createStoresEventAndReturnsLocation() {
        ResponseEntity<String> response = post(
                request().assignedUserIds(List.of(colleague.getId())).build(), teacherToken);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getHeaders().getLocation()).isNotNull();
        assertThat(response.getHeaders().getLocation().getPath()).startsWith("/api/events/");

        UserEvent stored = eventRepository.findAll().getFirst();

        assertThat(stored.getName()).isEqualTo("Заседание кафедры");
        assertThat(stored.getColor()).isEqualTo("#3F51B5");
        assertThat(stored.getStatus()).isEqualTo(EventStatus.NOT_STARTED);
        assertThat(stored.getNotificationFrequency()).isEqualTo(NotificationFrequency.WEEKLY);
        assertThat(stored.getNextNotificationAt()).isNull();
        assertThat(stored.isStartNotified()).isFalse();
    }

    @Test
    void ownerComesFromTokenNotFromBody() {
        String body = """
                {
                  "name": "Подмена владельца",
                  "startedAt": "2026-09-01T10:00:00+03:00",
                  "endedAt": "2026-09-01T11:00:00+03:00",
                  "allDay": false,
                  "color": "#3F51B5",
                  "status": "NOT_STARTED",
                  "notificationFrequency": "NONE",
                  "user": %d,
                  "owner": { "id": %d, "username": "calendar_colleague" }
                }
                """.formatted(colleague.getId(), colleague.getId());

        assertThat(post(body, teacherToken).getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(eventRepository.findAll().getFirst().getOwner().getId()).isEqualTo(teacher.getId());
    }

    @Test
    void createdEventCarriesAssignedUsers() {
        UserEventResponseDto card = created(
                request().assignedUserIds(List.of(teacher.getId(), colleague.getId())).build(), teacherToken);

        assertThat(card.getOwner().getUsername()).isEqualTo("calendar_teacher");
        assertThat(card.getAssignedUsers())
                .extracting(EventUserDto::getUsername)
                .containsExactlyInAnyOrder("calendar_teacher", "calendar_colleague");
    }

    @Test
    void repeatedAssignedIdIsStoredOnce() {
        UserEventResponseDto card = created(
                request().assignedUserIds(List.of(colleague.getId(), colleague.getId())).build(), teacherToken);

        assertThat(card.getAssignedUsers()).hasSize(1);
    }

    @Test
    void eventWithoutAssignedUsersIsAllowed() {
        assertThat(created(request().build(), teacherToken).getAssignedUsers()).isEmpty();
    }

    @Test
    void endBeforeStartGives400() {
        ResponseEntity<String> response = post(request()
                .startedAt(OffsetDateTime.parse("2026-09-01T12:00:00+03:00"))
                .endedAt(OffsetDateTime.parse("2026-09-01T10:00:00+03:00"))
                .build(), teacherToken);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).contains("раньше даты начала");
    }

    @Test
    void endEqualToStartIsAllowed() {
        OffsetDateTime moment = OffsetDateTime.parse("2026-09-01T10:00:00+03:00");

        assertThat(post(request().startedAt(moment).endedAt(moment).build(), teacherToken)
                .getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }

    @Test
    void colorWithoutHashGives400() {
        assertThat(post(request().color("3F51B5").build(), teacherToken).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void colorOfWrongLengthGives400() {
        assertThat(post(request().color("#3F51B").build(), teacherToken).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(post(request().color("#3F51B5A").build(), teacherToken).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void colorOutsideHexGives400() {
        assertThat(post(request().color("#ZZZZZZ").build(), teacherToken).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void unknownAssignedUserGives400() {
        ResponseEntity<String> response = post(
                request().assignedUserIds(List.of(colleague.getId(), 9999L)).build(), teacherToken);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).contains("несуществующие");
        assertThat(eventRepository.count()).isZero();
    }

    @Test
    void bodyWithoutRequiredFieldsGives400() {
        assertThat(post(request().name(null).build(), teacherToken).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(post(request().status(null).build(), teacherToken).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(post(request().allDay(null).build(), teacherToken).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(post(request().notificationFrequency(null).build(), teacherToken).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void unknownStatusInBodyGives400() {
        String body = """
                {
                  "name": "Событие",
                  "startedAt": "2026-09-01T10:00:00+03:00",
                  "endedAt": "2026-09-01T11:00:00+03:00",
                  "allDay": false,
                  "color": "#3F51B5",
                  "status": "POSTPONED",
                  "notificationFrequency": "NONE"
                }
                """;

        assertThat(post(body, teacherToken).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void updateReplacesAssignedUsersEntirely() {
        Long id = created(request().assignedUserIds(List.of(teacher.getId(), colleague.getId())).build(),
                teacherToken).getId();

        assertThat(put(id, request().name("Перенесённое заседание")
                .assignedUserIds(List.of(colleague.getId()))
                .status(EventStatus.IN_PROGRESS)
                .build(), teacherToken).getStatusCode()).isEqualTo(HttpStatus.OK);

        UserEventResponseDto card = getCard(id, teacherToken);

        assertThat(card.getName()).isEqualTo("Перенесённое заседание");
        assertThat(card.getStatus()).isEqualTo(EventStatus.IN_PROGRESS);
        assertThat(card.getAssignedUsers())
                .extracting(EventUserDto::getUsername)
                .containsExactly("calendar_colleague");
    }

    @Test
    void updateKeepsOwnerAndSchedulerColumns() {
        Long id = created(request().assignedUserIds(List.of(colleague.getId())).build(), teacherToken).getId();

        put(id, request().name("Правка от назначенного").assignedUserIds(List.of(colleague.getId())).build(),
                login("calendar_colleague"));

        UserEvent stored = eventRepository.findById(id).orElseThrow();

        assertThat(stored.getName()).isEqualTo("Правка от назначенного");
        assertThat(stored.getOwner().getId()).isEqualTo(teacher.getId());
        assertThat(stored.getNextNotificationAt()).isNull();
        assertThat(stored.isStartNotified()).isFalse();
    }

    @Test
    void updateOfStrangersEventGives404() {
        Long id = event("Чужое", "2026-09-01T10:00:00+03:00", colleague, EventStatus.NOT_STARTED).getId();

        assertThat(put(id, request().build(), teacherToken).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void deleteRemovesEvent() {
        Long id = created(request().assignedUserIds(List.of(colleague.getId())).build(), teacherToken).getId();

        assertThat(delete(id, teacherToken).getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(eventRepository.existsById(id)).isFalse();
        assertThat(get(id, teacherToken).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void assigneeCanDelete() {
        Long id = created(request().assignedUserIds(List.of(colleague.getId())).build(), teacherToken).getId();

        assertThat(delete(id, login("calendar_colleague")).getStatusCode())
                .isEqualTo(HttpStatus.NO_CONTENT);
    }

    @Test
    void deleteOfStrangersEventGives404() {
        Long id = event("Чужое", "2026-09-01T10:00:00+03:00", colleague, EventStatus.NOT_STARTED).getId();

        assertThat(delete(id, teacherToken).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(eventRepository.existsById(id)).isTrue();
    }

    @Test
    void plainUserCannotCreate() {
        createUser("calendar_writer");

        assertThat(post(request().build(), login("calendar_writer")).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }
}
