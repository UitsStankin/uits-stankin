package ru.stankin.uits.module.tasks.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import ru.stankin.uits.module.tasks.enums.TaskPriority;
import ru.stankin.uits.module.tasks.enums.TaskStatus;
import ru.stankin.uits.module.tasks.enums.TaskTargetScope;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskResponseDto {
    private Long id;
    private String title;
    private String description;
    private TaskStatus status;
    private TaskPriority priority;
    private TaskTargetScope targetScope;
    private String audienceLabel;
    private LocalDate startDate;
    private LocalDate dueDate;
    private TaskAuthorDto author;
    private List<TaskAssigneeResponseDto> assignees;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private OffsetDateTime archivedAt;
}
