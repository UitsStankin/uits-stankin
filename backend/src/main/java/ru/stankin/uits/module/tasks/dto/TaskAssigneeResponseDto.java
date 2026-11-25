package ru.stankin.uits.module.tasks.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import ru.stankin.uits.module.tasks.enums.TaskAssigneeStatus;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskAssigneeResponseDto {
    private Long userId;
    private String firstName;
    private String lastName;
    private TaskAssigneeStatus status;
    private OffsetDateTime assignedAt;
    private OffsetDateTime completedAt;
}
