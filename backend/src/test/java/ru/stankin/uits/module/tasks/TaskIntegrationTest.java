package ru.stankin.uits.module.tasks;

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
import ru.stankin.uits.module.tasks.dto.TaskAssigneeResponseDto;
import ru.stankin.uits.module.tasks.dto.TaskMyStatusUpdateDto;
import ru.stankin.uits.module.tasks.dto.TaskRequestDto;
import ru.stankin.uits.module.tasks.dto.TaskResponseDto;
import ru.stankin.uits.module.tasks.dto.TaskStatusUpdateDto;
import ru.stankin.uits.module.tasks.enums.TaskAssigneeStatus;
import ru.stankin.uits.module.tasks.enums.TaskPriority;
import ru.stankin.uits.module.tasks.enums.TaskStatus;
import ru.stankin.uits.module.tasks.enums.TaskTargetScope;
import ru.stankin.uits.module.user.entity.User;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class TaskIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private EntityManagerFactory entityManagerFactory;

    private User admin;
    private User moderator;
    private User teacher;
    private User staff;
    private User blocked;

    private String adminToken;
    private String moderatorToken;
    private String teacherToken;
    private String staffToken;

    @BeforeEach
    void setUp() {
        admin = createNamedUser("task_admin", "Админов", "Артём", true, TestRole.ADMIN);
        moderator = createNamedUser("task_moder", "Модератов", "Илья", true, TestRole.MODERATOR);
        teacher = createNamedUser("task_teacher", "Преподов", "Сергей", true, TestRole.TEACHER);
        staff = createNamedUser("task_staff", "Чебан", "Ирина", true, TestRole.USER);
        blocked = createNamedUser("task_blocked", "Уволен", "Олег", false, TestRole.TEACHER);

        adminToken = login("task_admin");
        moderatorToken = login("task_moder");
        teacherToken = login("task_teacher");
        staffToken = login("task_staff");
    }

    private User createNamedUser(String username, String lastName, String firstName, boolean active, TestRole... roles) {
        User user = createUser(username, roles);
        user.setLastName(lastName);
        user.setFirstName(firstName);
        user.setEmail(username + "@stankin.ru");
        user.setActive(active);
        return userRepository.save(user);
    }

    private HttpHeaders authJson(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);
        return headers;
    }

    private HttpEntity<Void> auth(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        return new HttpEntity<>(headers);
    }

    private TaskRequestDto.TaskRequestDtoBuilder validRequest() {
        return TaskRequestDto.builder()
                .title("Прохождение опроса")
                .description("https://forms.yandex.ru/example")
                .priority(TaskPriority.NORMAL)
                .targetScope(TaskTargetScope.CUSTOM)
                .audienceLabel("УВП и ППС")
                .startDate(LocalDate.of(2026, 11, 12))
                .dueDate(LocalDate.of(2026, 11, 27))
                .assigneeIds(List.of(staff.getId()));
    }

    private TaskResponseDto createTask(TaskRequestDto body, String token) {
        ResponseEntity<TaskResponseDto> response = restTemplate.exchange(
                "/api/tasks", HttpMethod.POST, new HttpEntity<>(body, authJson(token)), TaskResponseDto.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getHeaders().getLocation()).isNotNull();
        assertThat(response.getBody()).isNotNull();
        return response.getBody();
    }

    @Test
    void createScopesExpandActiveStaffAndTeachersAndNeverExposeSecrets() {
        TaskResponseDto allStaff = createTask(validRequest()
                .title("Для всех сотрудников")
                .targetScope(TaskTargetScope.ALL_STAFF)
                .assigneeIds(List.of())
                .build(), teacherToken);

        assertThat(allStaff.getAssignees())
                .extracting(TaskAssigneeResponseDto::getUserId)
                .containsExactlyInAnyOrder(admin.getId(), moderator.getId(), teacher.getId(), staff.getId())
                .doesNotContain(blocked.getId());

        TaskResponseDto allTeachers = createTask(validRequest()
                .title("Только ППС")
                .targetScope(TaskTargetScope.ALL_TEACHERS)
                .assigneeIds(List.of())
                .build(), moderatorToken);

        assertThat(allTeachers.getAssignees())
                .extracting(TaskAssigneeResponseDto::getUserId)
                .containsExactly(teacher.getId());

        ResponseEntity<String> raw = restTemplate.exchange(
                "/api/tasks/" + allStaff.getId(), HttpMethod.GET, auth(staffToken), String.class);
        assertThat(raw.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(raw.getBody())
                .doesNotContain("task_admin")
                .doesNotContain("task_staff")
                .doesNotContain("@stankin.ru");
    }

    @Test
    void validationRejectsBadDatesAndUnknownOrInactiveAssignees() {
        ResponseEntity<ProblemDetail> badDates = restTemplate.exchange(
                "/api/tasks",
                HttpMethod.POST,
                new HttpEntity<>(validRequest()
                        .startDate(LocalDate.of(2026, 11, 20))
                        .dueDate(LocalDate.of(2026, 11, 19))
                        .build(), authJson(teacherToken)),
                ProblemDetail.class);

        assertThat(badDates.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(fieldErrors(badDates)).containsKey("dueDate");

        ResponseEntity<ProblemDetail> unknownAssignee = restTemplate.exchange(
                "/api/tasks",
                HttpMethod.POST,
                new HttpEntity<>(validRequest().assigneeIds(List.of(99999L)).build(), authJson(teacherToken)),
                ProblemDetail.class);

        assertThat(unknownAssignee.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(fieldErrors(unknownAssignee)).containsKey("assigneeIds");

        ResponseEntity<ProblemDetail> inactiveAssignee = restTemplate.exchange(
                "/api/tasks",
                HttpMethod.POST,
                new HttpEntity<>(validRequest().assigneeIds(List.of(blocked.getId())).build(), authJson(teacherToken)),
                ProblemDetail.class);

        assertThat(inactiveAssignee.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(fieldErrors(inactiveAssignee)).containsKey("assigneeIds");
    }

    @Test
    void putPreservesPersonalStatusesOfRetainedAssigneesAndEnforcesAuthorOrEditor() {
        TaskResponseDto created = createTask(validRequest()
                .assigneeIds(List.of(staff.getId(), teacher.getId()))
                .build(), teacherToken);

        ResponseEntity<TaskResponseDto> myDone = restTemplate.exchange(
                "/api/tasks/" + created.getId() + "/my-status",
                HttpMethod.PATCH,
                new HttpEntity<>(new TaskMyStatusUpdateDto(TaskAssigneeStatus.DONE), authJson(staffToken)),
                TaskResponseDto.class);
        assertThat(myDone.getStatusCode()).isEqualTo(HttpStatus.OK);

        ResponseEntity<ProblemDetail> forbiddenPut = restTemplate.exchange(
                "/api/tasks/" + created.getId(),
                HttpMethod.PUT,
                new HttpEntity<>(validRequest().title("Чужая правка").build(), authJson(staffToken)),
                ProblemDetail.class);
        assertThat(forbiddenPut.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        ResponseEntity<TaskResponseDto> updated = restTemplate.exchange(
                "/api/tasks/" + created.getId(),
                HttpMethod.PUT,
                new HttpEntity<>(validRequest()
                        .title("Обновлённая задача")
                        .assigneeIds(List.of(staff.getId(), moderator.getId()))
                        .build(), authJson(teacherToken)),
                TaskResponseDto.class);

        assertThat(updated.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(updated.getBody()).isNotNull();
        assertThat(updated.getBody().getTitle()).isEqualTo("Обновлённая задача");
        assertThat(updated.getBody().getAssignees()).hasSize(2);

        TaskAssigneeResponseDto keptStaff = updated.getBody().getAssignees().stream()
                .filter(a -> a.getUserId().equals(staff.getId()))
                .findFirst().orElseThrow();
        assertThat(keptStaff.getStatus()).isEqualTo(TaskAssigneeStatus.DONE);
        assertThat(keptStaff.getCompletedAt()).isNotNull();

        TaskAssigneeResponseDto addedMod = updated.getBody().getAssignees().stream()
                .filter(a -> a.getUserId().equals(moderator.getId()))
                .findFirst().orElseThrow();
        assertThat(addedMod.getStatus()).isEqualTo(TaskAssigneeStatus.OPEN);
        assertThat(addedMod.getCompletedAt()).isNull();
    }

    @Test
    void claimMyStatusAndArchiveRulesWorkEndToEnd() {
        TaskResponseDto unassigned = createTask(validRequest()
                .title("Без исполнителя")
                .assigneeIds(List.of())
                .build(), teacherToken);

        ResponseEntity<TaskResponseDto> claimed = restTemplate.exchange(
                "/api/tasks/" + unassigned.getId() + "/claim",
                HttpMethod.POST,
                auth(staffToken),
                TaskResponseDto.class);
        assertThat(claimed.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(claimed.getBody()).isNotNull();
        assertThat(claimed.getBody().getStatus()).isEqualTo(TaskStatus.IN_PROGRESS);
        assertThat(claimed.getBody().getAssignees()).hasSize(1);
        assertThat(claimed.getBody().getAssignees().getFirst().getStatus()).isEqualTo(TaskAssigneeStatus.IN_PROGRESS);

        ResponseEntity<ProblemDetail> soleArchiveForbidden = restTemplate.exchange(
                "/api/tasks/" + unassigned.getId() + "/status",
                HttpMethod.PATCH,
                new HttpEntity<>(new TaskStatusUpdateDto(TaskStatus.ARCHIVED), authJson(staffToken)),
                ProblemDetail.class);
        assertThat(soleArchiveForbidden.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        ResponseEntity<TaskResponseDto> myDone = restTemplate.exchange(
                "/api/tasks/" + unassigned.getId() + "/my-status",
                HttpMethod.PATCH,
                new HttpEntity<>(new TaskMyStatusUpdateDto(TaskAssigneeStatus.DONE), authJson(staffToken)),
                TaskResponseDto.class);
        assertThat(myDone.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(myDone.getBody()).isNotNull();
        assertThat(myDone.getBody().getStatus()).isEqualTo(TaskStatus.DONE);

        ResponseEntity<ProblemDetail> unassignedMyStatusForbidden = restTemplate.exchange(
                "/api/tasks/" + unassigned.getId() + "/my-status",
                HttpMethod.PATCH,
                new HttpEntity<>(new TaskMyStatusUpdateDto(TaskAssigneeStatus.DONE), authJson(moderatorToken)),
                ProblemDetail.class);
        assertThat(unassignedMyStatusForbidden.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        ResponseEntity<TaskResponseDto> archived = restTemplate.exchange(
                "/api/tasks/" + unassigned.getId() + "/status",
                HttpMethod.PATCH,
                new HttpEntity<>(new TaskStatusUpdateDto(TaskStatus.ARCHIVED), authJson(teacherToken)),
                TaskResponseDto.class);
        assertThat(archived.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(archived.getBody()).isNotNull();
        assertThat(archived.getBody().getStatus()).isEqualTo(TaskStatus.ARCHIVED);
        assertThat(archived.getBody().getArchivedAt()).isNotNull();

        ResponseEntity<ProblemDetail> claimArchived = restTemplate.exchange(
                "/api/tasks/" + unassigned.getId() + "/claim",
                HttpMethod.POST,
                auth(adminToken),
                ProblemDetail.class);
        assertThat(claimArchived.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);

        ResponseEntity<ProblemDetail> myStatusArchived = restTemplate.exchange(
                "/api/tasks/" + unassigned.getId() + "/my-status",
                HttpMethod.PATCH,
                new HttpEntity<>(new TaskMyStatusUpdateDto(TaskAssigneeStatus.OPEN), authJson(staffToken)),
                ProblemDetail.class);
        assertThat(myStatusArchived.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);

        ResponseEntity<ProblemDetail> soleUnarchiveForbidden = restTemplate.exchange(
                "/api/tasks/" + unassigned.getId() + "/status",
                HttpMethod.PATCH,
                new HttpEntity<>(new TaskStatusUpdateDto(TaskStatus.OPEN), authJson(staffToken)),
                ProblemDetail.class);
        assertThat(soleUnarchiveForbidden.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        ResponseEntity<TaskResponseDto> unarchived = restTemplate.exchange(
                "/api/tasks/" + unassigned.getId() + "/status",
                HttpMethod.PATCH,
                new HttpEntity<>(new TaskStatusUpdateDto(TaskStatus.OPEN), authJson(adminToken)),
                TaskResponseDto.class);
        assertThat(unarchived.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(unarchived.getBody()).isNotNull();
        assertThat(unarchived.getBody().getArchivedAt()).isNull();
    }

    @Test
    void listFiltersPaginationSortWhitelistAndConstantQueries() {
        TaskResponseDto earlier = createTask(validRequest()
                .title("Первая задача 100%_ok")
                .startDate(LocalDate.of(2026, 11, 1))
                .dueDate(LocalDate.of(2026, 11, 10))
                .assigneeIds(List.of(staff.getId()))
                .build(), teacherToken);
        TaskResponseDto later = createTask(validRequest()
                .title("Вторая задача")
                .startDate(LocalDate.of(2026, 11, 15))
                .dueDate(LocalDate.of(2026, 11, 20))
                .assigneeIds(List.of(moderator.getId()))
                .build(), teacherToken);

        Statistics statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
        statistics.setStatisticsEnabled(true);
        statistics.clear();

        ResponseEntity<PageResponseDto<TaskResponseDto>> page = restTemplate.exchange(
                "/api/tasks?mine=true&from=2026-11-05&to=2026-11-12&q={q}",
                HttpMethod.GET,
                auth(staffToken),
                new ParameterizedTypeReference<>() {
                },
                "100%_");

        assertThat(page.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(page.getBody()).isNotNull();
        assertThat(page.getBody().size()).isEqualTo(50);
        assertThat(page.getBody().content())
                .extracting(TaskResponseDto::getId)
                .containsExactly(earlier.getId());
        assertThat(page.getBody().content()).doesNotContain(later);
        assertThat(statistics.getPrepareStatementCount()).isLessThanOrEqualTo(4);

        ResponseEntity<ProblemDetail> badSort = restTemplate.exchange(
                "/api/tasks?sort=author.username",
                HttpMethod.GET,
                auth(staffToken),
                ProblemDetail.class);
        assertThat(badSort.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);

        ResponseEntity<Void> deleted = restTemplate.exchange(
                "/api/tasks/" + later.getId(),
                HttpMethod.DELETE,
                auth(moderatorToken),
                Void.class);
        assertThat(deleted.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
    }

    @Test
    void nonAuthorTeacherAndStaffReceive403OnPutAndDelete() {
        TaskResponseDto created = createTask(validRequest().build(), teacherToken);

        createNamedUser("task_other_teacher", "Другов", "Пётр", true, TestRole.TEACHER);
        String otherTeacherToken = login("task_other_teacher");

        ResponseEntity<ProblemDetail> otherTeacherPut = restTemplate.exchange(
                "/api/tasks/" + created.getId(),
                HttpMethod.PUT,
                new HttpEntity<>(validRequest().title("Чужая правка преподавателя").build(), authJson(otherTeacherToken)),
                ProblemDetail.class);
        assertThat(otherTeacherPut.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        ResponseEntity<ProblemDetail> otherTeacherDelete = restTemplate.exchange(
                "/api/tasks/" + created.getId(),
                HttpMethod.DELETE,
                auth(otherTeacherToken),
                ProblemDetail.class);
        assertThat(otherTeacherDelete.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        ResponseEntity<ProblemDetail> staffDelete = restTemplate.exchange(
                "/api/tasks/" + created.getId(),
                HttpMethod.DELETE,
                auth(staffToken),
                ProblemDetail.class);
        assertThat(staffDelete.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        ResponseEntity<TaskResponseDto> stillExists = restTemplate.exchange(
                "/api/tasks/" + created.getId(),
                HttpMethod.GET,
                auth(staffToken),
                TaskResponseDto.class);
        assertThat(stillExists.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> fieldErrors(ResponseEntity<ProblemDetail> response) {
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getProperties()).isNotNull();
        return (Map<String, Object>) response.getBody().getProperties().get("errors");
    }
}
