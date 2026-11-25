package ru.stankin.uits.module.tasks.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.stankin.uits.common.PageResponseDto;
import ru.stankin.uits.common.SearchText;
import ru.stankin.uits.common.SortFields;
import ru.stankin.uits.common.exception.FieldValidationException;
import ru.stankin.uits.common.exception.InvalidRequestException;
import ru.stankin.uits.common.exception.NotFoundException;
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
import ru.stankin.uits.module.user.entity.User;
import ru.stankin.uits.module.user.service.UserService;
import ru.stankin.uits.security.SecurityUser;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TaskService {

    private static final Set<String> SORT_FIELDS = Set.of(
            "id", "title", "status", "priority", "startDate", "dueDate", "createdAt"
    );

    private final TaskRepository taskRepository;
    private final TaskMapper taskMapper;
    private final UserService userService;

    @Transactional(readOnly = true)
    public PageResponseDto<TaskResponseDto> getTasks(
            TaskStatus status,
            boolean archived,
            boolean mine,
            Long assigneeId,
            LocalDate from,
            LocalDate to,
            String q,
            Pageable pageable
    ) {
        SortFields.validate(pageable.getSort(), SORT_FIELDS);
        if (from != null && to != null && to.isBefore(from)) {
            throw new InvalidRequestException("Начало периода не может быть позже конца периода");
        }

        Long mineUserId = mine ? currentUser().getId() : null;
        String normalizedQ = SearchText.escapeLike(SearchText.normalize(q));

        Page<Task> page = taskRepository.findByFilters(
                status, archived, mineUserId, assigneeId, from, to, normalizedQ, pageable
        );
        warmUpDetails(page.getContent());

        return PageResponseDto.from(page.map(taskMapper::toDto));
    }

    @Transactional(readOnly = true)
    public TaskResponseDto getTask(Long id) {
        return taskMapper.toDto(requireTaskWithDetails(id));
    }

    @Transactional
    public TaskResponseDto createTask(TaskRequestDto request) {
        TaskTargetScope scope = request.getTargetScope() != null ? request.getTargetScope() : TaskTargetScope.CUSTOM;
        TaskPriority priority = request.getPriority() != null ? request.getPriority() : TaskPriority.NORMAL;
        List<User> targetUsers = resolveTargetUsers(scope, request.getAssigneeIds());

        Task task = Task.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .status(TaskStatus.OPEN)
                .priority(priority)
                .targetScope(scope)
                .audienceLabel(request.getAudienceLabel())
                .startDate(request.getStartDate())
                .dueDate(request.getDueDate())
                .author(currentUser())
                .build();

        OffsetDateTime now = OffsetDateTime.now();
        for (User targetUser : targetUsers) {
            task.getAssignees().add(TaskAssignee.builder()
                    .task(task)
                    .user(targetUser)
                    .status(TaskAssigneeStatus.OPEN)
                    .assignedAt(now)
                    .build());
        }

        return taskMapper.toDto(taskRepository.saveAndFlush(task));
    }

    @Transactional
    public TaskResponseDto updateTask(Long id, TaskRequestDto request) {
        Task task = requireTaskWithDetails(id);
        User actor = currentUser();
        if (!isPrivileged(task, actor)) {
            throw new AccessDeniedException("Недостаточно прав.");
        }

        TaskTargetScope scope = request.getTargetScope() != null ? request.getTargetScope() : TaskTargetScope.CUSTOM;
        TaskPriority priority = request.getPriority() != null ? request.getPriority() : TaskPriority.NORMAL;
        List<User> targetUsers = resolveTargetUsers(scope, request.getAssigneeIds());

        task.setTitle(request.getTitle());
        task.setDescription(request.getDescription());
        task.setPriority(priority);
        task.setTargetScope(scope);
        task.setAudienceLabel(request.getAudienceLabel());
        task.setStartDate(request.getStartDate());
        task.setDueDate(request.getDueDate());

        syncAssigneesPreservingState(task, targetUsers);
        task.setUpdatedAt(OffsetDateTime.now());

        return taskMapper.toDto(taskRepository.saveAndFlush(task));
    }

    @Transactional
    public TaskResponseDto updateStatus(Long id, TaskStatusUpdateDto request) {
        Task task = requireTaskWithDetails(id);
        User actor = currentUser();

        boolean privileged = isPrivileged(task, actor);
        boolean soleAssignee = isSoleAssignee(task, actor);

        if (!privileged && !soleAssignee) {
            throw new AccessDeniedException("Недостаточно прав.");
        }
        if (!privileged && (request.getStatus() == TaskStatus.ARCHIVED || task.getStatus() == TaskStatus.ARCHIVED)) {
            throw new AccessDeniedException("Недостаточно прав.");
        }

        OffsetDateTime now = OffsetDateTime.now();
        task.setStatus(request.getStatus());
        if (request.getStatus() == TaskStatus.ARCHIVED) {
            if (task.getArchivedAt() == null) {
                task.setArchivedAt(now);
            }
        } else {
            task.setArchivedAt(null);
        }
        task.setUpdatedAt(now);

        return taskMapper.toDto(taskRepository.saveAndFlush(task));
    }

    @Transactional
    public TaskResponseDto claimTask(Long id) {
        Task task = requireTaskWithDetails(id);
        if (task.getStatus() == TaskStatus.ARCHIVED) {
            throw new InvalidRequestException("Нельзя взять в работу архивную задачу");
        }

        User actor = currentUser();
        OffsetDateTime now = OffsetDateTime.now();

        TaskAssignee existing = findAssignee(task, actor.getId());
        if (existing != null) {
            existing.setStatus(TaskAssigneeStatus.IN_PROGRESS);
            existing.setCompletedAt(null);
        } else {
            task.getAssignees().add(TaskAssignee.builder()
                    .task(task)
                    .user(actor)
                    .status(TaskAssigneeStatus.IN_PROGRESS)
                    .assignedAt(now)
                    .build());
        }

        if (task.getStatus() == TaskStatus.OPEN) {
            task.setStatus(TaskStatus.IN_PROGRESS);
        }
        task.setUpdatedAt(now);

        return taskMapper.toDto(taskRepository.saveAndFlush(task));
    }

    @Transactional
    public TaskResponseDto updateMyStatus(Long id, TaskMyStatusUpdateDto request) {
        Task task = requireTaskWithDetails(id);
        User actor = currentUser();

        TaskAssignee myAssignment = findAssignee(task, actor.getId());
        if (myAssignment == null) {
            throw new AccessDeniedException("Недостаточно прав.");
        }
        if (task.getStatus() == TaskStatus.ARCHIVED) {
            throw new InvalidRequestException("Нельзя изменить статус в архивной задаче");
        }

        OffsetDateTime now = OffsetDateTime.now();
        myAssignment.setStatus(request.getStatus());
        myAssignment.setCompletedAt(request.getStatus() == TaskAssigneeStatus.DONE ? now : null);

        if (task.getAssignees().size() == 1 && request.getStatus() == TaskAssigneeStatus.DONE) {
            task.setStatus(TaskStatus.DONE);
        }
        task.setUpdatedAt(now);

        return taskMapper.toDto(taskRepository.saveAndFlush(task));
    }

    @Transactional
    public void deleteTask(Long id) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> taskNotFound(id));
        if (!isPrivileged(task, currentUser())) {
            throw new AccessDeniedException("Недостаточно прав.");
        }
        taskRepository.delete(task);
    }

    private void syncAssigneesPreservingState(Task task, List<User> targetUsers) {
        Set<Long> targetUserIds = targetUsers.stream()
                .map(User::getId)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        Map<Long, TaskAssignee> existingByUserId = new LinkedHashMap<>();
        for (TaskAssignee existing : task.getAssignees()) {
            existingByUserId.put(existing.getUser().getId(), existing);
        }

        task.getAssignees().removeIf(existing -> !targetUserIds.contains(existing.getUser().getId()));

        OffsetDateTime now = OffsetDateTime.now();
        for (User targetUser : targetUsers) {
            if (!existingByUserId.containsKey(targetUser.getId())) {
                task.getAssignees().add(TaskAssignee.builder()
                        .task(task)
                        .user(targetUser)
                        .status(TaskAssigneeStatus.OPEN)
                        .assignedAt(now)
                        .build());
            }
        }
    }

    private List<User> resolveTargetUsers(TaskTargetScope scope, List<Long> assigneeIds) {
        return switch (scope) {
            case ALL_STAFF -> userService.findAllActiveUsers();
            case ALL_TEACHERS -> userService.findAllActiveTeachers();
            case CUSTOM -> resolveCustomAssignees(assigneeIds);
        };
    }

    private List<User> resolveCustomAssignees(List<Long> assigneeIds) {
        if (assigneeIds == null || assigneeIds.isEmpty()) {
            return List.of();
        }

        Set<Long> uniqueIds = new LinkedHashSet<>(assigneeIds);
        List<User> found = userService.getUsersByIds(uniqueIds);
        Map<Long, User> byId = found.stream()
                .collect(Collectors.toMap(User::getId, user -> user));

        List<Long> missing = new ArrayList<>();
        List<Long> inactive = new ArrayList<>();
        List<User> resolved = new ArrayList<>(uniqueIds.size());

        for (Long userId : uniqueIds) {
            User user = byId.get(userId);
            if (user == null) {
                missing.add(userId);
            } else if (!user.isActive()) {
                inactive.add(userId);
            } else {
                resolved.add(user);
            }
        }

        if (!missing.isEmpty()) {
            throw new FieldValidationException("assigneeIds", "Сотрудники не найдены: " + missing);
        }
        if (!inactive.isEmpty()) {
            throw new FieldValidationException("assigneeIds", "Указаны неактивные сотрудники: " + inactive);
        }

        return resolved;
    }

    private void warmUpDetails(List<Task> tasks) {
        if (tasks.isEmpty()) {
            return;
        }
        taskRepository.findWithDetailsByIdIn(tasks.stream().map(Task::getId).toList());
    }

    private Task requireTaskWithDetails(Long id) {
        return taskRepository.findWithDetailsById(id)
                .orElseThrow(() -> taskNotFound(id));
    }

    private NotFoundException taskNotFound(Long id) {
        return new NotFoundException("Задача id=" + id + " не найдена");
    }

    private boolean isPrivileged(Task task, User user) {
        return user.isSuperuser() || user.isModerator() || task.getAuthor().getId().equals(user.getId());
    }

    private boolean isSoleAssignee(Task task, User user) {
        return task.getAssignees().size() == 1
                && task.getAssignees().getFirst().getUser().getId().equals(user.getId());
    }

    private TaskAssignee findAssignee(Task task, Long userId) {
        for (TaskAssignee assignee : task.getAssignees()) {
            if (assignee.getUser().getId().equals(userId)) {
                return assignee;
            }
        }
        return null;
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
