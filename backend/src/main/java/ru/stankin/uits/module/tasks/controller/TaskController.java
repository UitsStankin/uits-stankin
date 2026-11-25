package ru.stankin.uits.module.tasks.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.UriComponentsBuilder;
import ru.stankin.uits.common.PageResponseDto;
import ru.stankin.uits.module.tasks.dto.TaskMyStatusUpdateDto;
import ru.stankin.uits.module.tasks.dto.TaskRequestDto;
import ru.stankin.uits.module.tasks.dto.TaskResponseDto;
import ru.stankin.uits.module.tasks.dto.TaskStatusUpdateDto;
import ru.stankin.uits.module.tasks.enums.TaskStatus;
import ru.stankin.uits.module.tasks.service.TaskService;

import java.net.URI;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public PageResponseDto<TaskResponseDto> getTasks(
            @RequestParam(name = "status", required = false) TaskStatus status,
            @RequestParam(name = "archived", defaultValue = "false") boolean archived,
            @RequestParam(name = "mine", defaultValue = "false") boolean mine,
            @RequestParam(name = "assigneeId", required = false) Long assigneeId,
            @RequestParam(name = "from", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(name = "to", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(name = "q", required = false) String q,
            @PageableDefault(size = 50, sort = {"dueDate", "id"}) Pageable pageable
    ) {
        return taskService.getTasks(status, archived, mine, assigneeId, from, to, q, pageable);
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public TaskResponseDto getTask(@PathVariable Long id) {
        return taskService.getTask(id);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR', 'TEACHER')")
    public ResponseEntity<TaskResponseDto> createTask(@Valid @RequestBody TaskRequestDto request) {
        TaskResponseDto created = taskService.createTask(request);
        URI location = UriComponentsBuilder.fromPath("/api/tasks/{id}")
                .buildAndExpand(created.getId())
                .toUri();

        return ResponseEntity.created(location).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public TaskResponseDto updateTask(@PathVariable Long id, @Valid @RequestBody TaskRequestDto request) {
        return taskService.updateTask(id, request);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("isAuthenticated()")
    public TaskResponseDto updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody TaskStatusUpdateDto request
    ) {
        return taskService.updateStatus(id, request);
    }

    @PostMapping("/{id}/claim")
    @PreAuthorize("isAuthenticated()")
    public TaskResponseDto claimTask(@PathVariable Long id) {
        return taskService.claimTask(id);
    }

    @PatchMapping("/{id}/my-status")
    @PreAuthorize("isAuthenticated()")
    public TaskResponseDto updateMyStatus(
            @PathVariable Long id,
            @Valid @RequestBody TaskMyStatusUpdateDto request
    ) {
        return taskService.updateMyStatus(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> deleteTask(@PathVariable Long id) {
        taskService.deleteTask(id);

        return ResponseEntity.noContent().build();
    }
}
