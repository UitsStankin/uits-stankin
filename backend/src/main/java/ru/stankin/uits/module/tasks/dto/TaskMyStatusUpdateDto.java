package ru.stankin.uits.module.tasks.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import ru.stankin.uits.module.tasks.enums.TaskAssigneeStatus;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskMyStatusUpdateDto {

    @NotNull(message = "Личный статус обязателен")
    private TaskAssigneeStatus status;
}
