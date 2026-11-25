package ru.stankin.uits.module.tasks;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mapstruct.factory.Mappers;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import ru.stankin.uits.common.exception.FieldValidationException;
import ru.stankin.uits.common.exception.InvalidRequestException;
import ru.stankin.uits.module.tasks.dto.TaskAssigneeResponseDto;
import ru.stankin.uits.module.tasks.dto.TaskMyStatusUpdateDto;
import ru.stankin.uits.module.tasks.dto.TaskRequestDto;
import ru.stankin.uits.module.tasks.dto.TaskResponseDto;
import ru.stankin.uits.module.tasks.dto.TaskStatusUpdateDto;
import ru.stankin.uits.module.tasks.entity.Task;
import ru.stankin.uits.module.tasks.entity.TaskAssignee;
import ru.stankin.uits.module.tasks.enums.TaskAssigneeStatus;
import ru.stankin.uits.module.tasks.enums.TaskPriority;
import ru.stankin.uits.module.tasks.enums.TaskStatus;
import ru.stankin.uits.module.tasks.enums.TaskTargetScope;
import ru.stankin.uits.module.tasks.mapper.TaskMapper;
import ru.stankin.uits.module.tasks.repository.TaskRepository;
import ru.stankin.uits.module.tasks.service.TaskService;
import ru.stankin.uits.module.user.entity.User;
import ru.stankin.uits.module.user.service.UserService;
import ru.stankin.uits.security.SecurityUser;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TaskServiceTest {

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private UserService userService;

    private final TaskMapper taskMapper = Mappers.getMapper(TaskMapper.class);

    private TaskService taskService;

    private User admin;
    private User moderator;
    private User teacher;
    private User staff;

    @BeforeEach
    void setUp() {
        taskService = new TaskService(taskRepository, taskMapper, userService);
        admin = user(1L, "admin", true, false, false, true);
        moderator = user(2L, "moder", false, true, false, true);
        teacher = user(3L, "teacher", false, false, true, true);
        staff = user(4L, "staff", false, false, false, true);
    }

    @AfterEach
    void clearSecurity() {
        SecurityContextHolder.clearContext();
    }

    private User user(Long id, String username, boolean superuser, boolean moderator, boolean teacher, boolean active) {
        return User.builder()
                .id(id)
                .username(username)
                .password("encoded")
                .firstName("Имя_" + username)
                .lastName("Фамилия_" + username)
                .superuser(superuser)
                .moderator(moderator)
                .teacher(teacher)
                .active(active)
                .build();
    }

    private void authenticate(User user) {
        SecurityUser principal = new SecurityUser(user);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    @Test
    void createTaskWithAllStaffAssignsAllActiveUsers() {
        authenticate(teacher);
        when(userService.findAllActiveUsers()).thenReturn(List.of(admin, teacher, staff));
        when(taskRepository.saveAndFlush(any(Task.class))).thenAnswer(inv -> {
            Task t = inv.getArgument(0);
            t.setId(10L);
            return t;
        });

        TaskResponseDto dto = taskService.createTask(TaskRequestDto.builder()
                .title("Общекафедральный опрос")
                .targetScope(TaskTargetScope.ALL_STAFF)
                .audienceLabel("Все сотрудники")
                .startDate(LocalDate.of(2026, 11, 12))
                .dueDate(LocalDate.of(2026, 11, 20))
                .build());

        assertThat(dto.getStatus()).isEqualTo(TaskStatus.OPEN);
        assertThat(dto.getPriority()).isEqualTo(TaskPriority.NORMAL);
        assertThat(dto.getTargetScope()).isEqualTo(TaskTargetScope.ALL_STAFF);
        assertThat(dto.getAssignees())
                .extracting(TaskAssigneeResponseDto::getUserId)
                .containsExactly(1L, 3L, 4L);
    }

    @Test
    void createTaskWithUnknownAssigneeThrowsFieldValidationException() {
        authenticate(teacher);
        when(userService.getUsersByIds(any())).thenReturn(List.of(staff));

        TaskRequestDto request = TaskRequestDto.builder()
                .title("Задача")
                .targetScope(TaskTargetScope.CUSTOM)
                .startDate(LocalDate.of(2026, 11, 12))
                .dueDate(LocalDate.of(2026, 11, 20))
                .assigneeIds(List.of(4L, 999L))
                .build();

        assertThatThrownBy(() -> taskService.createTask(request))
                .isInstanceOf(FieldValidationException.class)
                .satisfies(ex -> assertThat(((FieldValidationException) ex).getField()).isEqualTo("assigneeIds"));
    }

    @Test
    void createTaskWithInactiveAssigneeThrowsFieldValidationException() {
        authenticate(teacher);
        User inactive = user(5L, "blocked", false, false, false, false);
        when(userService.getUsersByIds(any())).thenReturn(List.of(inactive));

        TaskRequestDto request = TaskRequestDto.builder()
                .title("Задача")
                .targetScope(TaskTargetScope.CUSTOM)
                .startDate(LocalDate.of(2026, 11, 12))
                .dueDate(LocalDate.of(2026, 11, 20))
                .assigneeIds(List.of(5L))
                .build();

        assertThatThrownBy(() -> taskService.createTask(request))
                .isInstanceOf(FieldValidationException.class)
                .satisfies(ex -> assertThat(((FieldValidationException) ex).getField()).isEqualTo("assigneeIds"));
    }

    @Test
    void updateTaskPreservesRetainedAssigneeStatusAndCompletedAt() {
        authenticate(teacher);
        OffsetDateTime assignedTime = OffsetDateTime.parse("2026-11-12T10:00:00Z");
        OffsetDateTime completedTime = OffsetDateTime.parse("2026-11-14T09:30:00Z");

        Task existing = Task.builder()
                .id(15L)
                .title("Старое название")
                .status(TaskStatus.IN_PROGRESS)
                .priority(TaskPriority.NORMAL)
                .targetScope(TaskTargetScope.CUSTOM)
                .startDate(LocalDate.of(2026, 11, 12))
                .dueDate(LocalDate.of(2026, 11, 20))
                .author(teacher)
                .assignees(new ArrayList<>())
                .build();
        existing.getAssignees().add(TaskAssignee.builder()
                .id(101L)
                .task(existing)
                .user(staff)
                .status(TaskAssigneeStatus.DONE)
                .assignedAt(assignedTime)
                .completedAt(completedTime)
                .build());
        existing.getAssignees().add(TaskAssignee.builder()
                .id(102L)
                .task(existing)
                .user(moderator)
                .status(TaskAssigneeStatus.OPEN)
                .assignedAt(assignedTime)
                .build());

        when(taskRepository.findWithDetailsById(15L)).thenReturn(Optional.of(existing));
        when(userService.getUsersByIds(any())).thenReturn(List.of(staff, admin));
        when(taskRepository.saveAndFlush(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));

        TaskResponseDto updated = taskService.updateTask(15L, TaskRequestDto.builder()
                .title("Новое название")
                .priority(TaskPriority.HIGH)
                .targetScope(TaskTargetScope.CUSTOM)
                .startDate(LocalDate.of(2026, 11, 13))
                .dueDate(LocalDate.of(2026, 11, 25))
                .assigneeIds(List.of(staff.getId(), admin.getId()))
                .build());

        assertThat(updated.getTitle()).isEqualTo("Новое название");
        assertThat(updated.getAssignees()).hasSize(2);

        TaskAssigneeResponseDto kept = updated.getAssignees().stream()
                .filter(a -> a.getUserId().equals(staff.getId()))
                .findFirst().orElseThrow();
        assertThat(kept.getStatus()).isEqualTo(TaskAssigneeStatus.DONE);
        assertThat(kept.getAssignedAt()).isEqualTo(assignedTime);
        assertThat(kept.getCompletedAt()).isEqualTo(completedTime);

        TaskAssigneeResponseDto added = updated.getAssignees().stream()
                .filter(a -> a.getUserId().equals(admin.getId()))
                .findFirst().orElseThrow();
        assertThat(added.getStatus()).isEqualTo(TaskAssigneeStatus.OPEN);
        assertThat(added.getCompletedAt()).isNull();
    }

    @Test
    void soleAssigneeCanChangeStatusExceptArchived() {
        authenticate(staff);
        Task task = Task.builder()
                .id(20L)
                .title("Одиночная задача")
                .status(TaskStatus.OPEN)
                .author(teacher)
                .assignees(new ArrayList<>())
                .build();
        task.getAssignees().add(TaskAssignee.builder()
                .task(task)
                .user(staff)
                .status(TaskAssigneeStatus.OPEN)
                .assignedAt(OffsetDateTime.now())
                .build());

        when(taskRepository.findWithDetailsById(20L)).thenReturn(Optional.of(task));
        when(taskRepository.saveAndFlush(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));

        TaskResponseDto inProgress = taskService.updateStatus(20L, new TaskStatusUpdateDto(TaskStatus.IN_PROGRESS));
        assertThat(inProgress.getStatus()).isEqualTo(TaskStatus.IN_PROGRESS);

        assertThatThrownBy(() -> taskService.updateStatus(20L, new TaskStatusUpdateDto(TaskStatus.ARCHIVED)))
                .isInstanceOf(AccessDeniedException.class);

        task.setStatus(TaskStatus.ARCHIVED);
        assertThatThrownBy(() -> taskService.updateStatus(20L, new TaskStatusUpdateDto(TaskStatus.OPEN)))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> taskService.updateStatus(20L, new TaskStatusUpdateDto(TaskStatus.IN_PROGRESS)))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void nonAuthorTeacherAndStaffCannotUpdateOrDeleteTask() {
        User otherTeacher = user(5L, "other_teacher", false, false, true, true);
        Task task = Task.builder()
                .id(25L)
                .title("Чужая задача")
                .status(TaskStatus.OPEN)
                .author(teacher)
                .assignees(new ArrayList<>())
                .build();
        TaskRequestDto request = TaskRequestDto.builder()
                .title("Попытка правки")
                .targetScope(TaskTargetScope.CUSTOM)
                .startDate(LocalDate.of(2026, 11, 12))
                .dueDate(LocalDate.of(2026, 11, 20))
                .build();

        authenticate(otherTeacher);
        when(taskRepository.findWithDetailsById(25L)).thenReturn(Optional.of(task));
        assertThatThrownBy(() -> taskService.updateTask(25L, request))
                .isInstanceOf(AccessDeniedException.class);

        when(taskRepository.findById(25L)).thenReturn(Optional.of(task));
        assertThatThrownBy(() -> taskService.deleteTask(25L))
                .isInstanceOf(AccessDeniedException.class);

        authenticate(staff);
        assertThatThrownBy(() -> taskService.deleteTask(25L))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void claimMovesOpenTaskToInProgressAndRejectsArchived() {
        authenticate(staff);
        Task openTask = Task.builder()
                .id(30L)
                .title("Открытая")
                .status(TaskStatus.OPEN)
                .author(teacher)
                .assignees(new ArrayList<>())
                .build();
        when(taskRepository.findWithDetailsById(30L)).thenReturn(Optional.of(openTask));
        when(taskRepository.saveAndFlush(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));

        TaskResponseDto claimed = taskService.claimTask(30L);
        assertThat(claimed.getStatus()).isEqualTo(TaskStatus.IN_PROGRESS);
        assertThat(claimed.getAssignees()).hasSize(1);
        assertThat(claimed.getAssignees().getFirst().getUserId()).isEqualTo(staff.getId());
        assertThat(claimed.getAssignees().getFirst().getStatus()).isEqualTo(TaskAssigneeStatus.IN_PROGRESS);

        openTask.setStatus(TaskStatus.ARCHIVED);
        assertThatThrownBy(() -> taskService.claimTask(30L))
                .isInstanceOf(InvalidRequestException.class);
    }

    @Test
    void myStatusDoneWithSoleAssigneeMarksWholeTaskDone() {
        authenticate(staff);
        Task task = Task.builder()
                .id(40L)
                .title("Единственный исполнитель")
                .status(TaskStatus.IN_PROGRESS)
                .author(teacher)
                .assignees(new ArrayList<>())
                .build();
        task.getAssignees().add(TaskAssignee.builder()
                .task(task)
                .user(staff)
                .status(TaskAssigneeStatus.IN_PROGRESS)
                .assignedAt(OffsetDateTime.now())
                .build());
        when(taskRepository.findWithDetailsById(40L)).thenReturn(Optional.of(task));
        when(taskRepository.saveAndFlush(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));

        TaskResponseDto done = taskService.updateMyStatus(40L, new TaskMyStatusUpdateDto(TaskAssigneeStatus.DONE));
        assertThat(done.getStatus()).isEqualTo(TaskStatus.DONE);
        assertThat(done.getAssignees().getFirst().getCompletedAt()).isNotNull();

        TaskResponseDto reopened = taskService.updateMyStatus(40L, new TaskMyStatusUpdateDto(TaskAssigneeStatus.OPEN));
        assertThat(reopened.getAssignees().getFirst().getCompletedAt()).isNull();
    }

    @Test
    void myStatusRejectsUnassignedUserAndArchivedTask() {
        authenticate(staff);
        Task task = Task.builder()
                .id(41L)
                .title("Чужая")
                .status(TaskStatus.OPEN)
                .author(teacher)
                .assignees(new ArrayList<>())
                .build();
        when(taskRepository.findWithDetailsById(41L)).thenReturn(Optional.of(task));

        assertThatThrownBy(() -> taskService.updateMyStatus(41L, new TaskMyStatusUpdateDto(TaskAssigneeStatus.DONE)))
                .isInstanceOf(AccessDeniedException.class);

        task.setStatus(TaskStatus.ARCHIVED);
        task.getAssignees().add(TaskAssignee.builder()
                .task(task)
                .user(staff)
                .status(TaskAssigneeStatus.OPEN)
                .assignedAt(OffsetDateTime.now())
                .build());

        assertThatThrownBy(() -> taskService.updateMyStatus(41L, new TaskMyStatusUpdateDto(TaskAssigneeStatus.DONE)))
                .isInstanceOf(InvalidRequestException.class);
    }

    @Test
    void getTasksValidatesSortWhitelistAndEscapesSearchQuery() {
        authenticate(staff);
        when(taskRepository.findByFilters(any(), anyBoolean(), any(), any(), any(), any(), any(), any()))
                .thenReturn(new PageImpl<>(List.of()));

        assertThatThrownBy(() -> taskService.getTasks(
                null, false, false, null, null, null, null,
                PageRequest.of(0, 50, Sort.by("unknownField"))))
                .isInstanceOf(InvalidRequestException.class);

        taskService.getTasks(
                null, false, true, null, null, null, "  100%_test  ",
                PageRequest.of(0, 50, Sort.by("dueDate", "id")));

        ArgumentCaptor<String> qCaptor = ArgumentCaptor.forClass(String.class);
        verify(taskRepository).findByFilters(
                eq(null), eq(false), eq(staff.getId()), eq(null),
                eq(null), eq(null), qCaptor.capture(), any());
        assertThat(qCaptor.getValue()).isEqualTo("100\\%\\_test");
    }
}
