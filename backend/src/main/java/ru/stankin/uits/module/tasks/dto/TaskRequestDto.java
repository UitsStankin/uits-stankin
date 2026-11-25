package ru.stankin.uits.module.tasks.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import ru.stankin.uits.module.tasks.enums.TaskPriority;
import ru.stankin.uits.module.tasks.enums.TaskTargetScope;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@TaskDatesConsistent
public class TaskRequestDto {

    @NotBlank(message = "Название задачи обязательно")
    @Size(max = 255, message = "Название задачи не длиннее 255 символов")
    private String title;

    private String description;

    @Builder.Default
    private TaskPriority priority = TaskPriority.NORMAL;

    @Builder.Default
    private TaskTargetScope targetScope = TaskTargetScope.CUSTOM;

    @Size(max = 150, message = "Подпись аудитории не длиннее 150 символов")
    private String audienceLabel;

    @NotNull(message = "Дата начала обязательна")
    private LocalDate startDate;

    @NotNull(message = "Дата срока выполнения обязательна")
    private LocalDate dueDate;

    private List<Long> assigneeIds;
}
