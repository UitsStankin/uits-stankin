package ru.stankin.uits.module.tasks;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;
import ru.stankin.uits.module.tasks.dto.TaskRequestDto;

import java.time.LocalDate;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class TaskDatesValidatorTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    private TaskRequestDto.TaskRequestDtoBuilder validRequest() {
        return TaskRequestDto.builder()
                .title("Подготовить отчёт")
                .startDate(LocalDate.of(2026, 11, 12))
                .dueDate(LocalDate.of(2026, 11, 27));
    }

    @Test
    void singleDayTaskWithEqualDatesIsValid() {
        TaskRequestDto dto = validRequest()
                .dueDate(LocalDate.of(2026, 11, 12))
                .build();

        assertThat(validator.validate(dto)).isEmpty();
    }

    @Test
    void dueDateAfterStartDateIsValid() {
        TaskRequestDto dto = validRequest().build();

        assertThat(validator.validate(dto)).isEmpty();
    }

    @Test
    void dueDateBeforeStartDateReportsViolationOnDueDate() {
        TaskRequestDto dto = validRequest()
                .startDate(LocalDate.of(2026, 11, 20))
                .dueDate(LocalDate.of(2026, 11, 19))
                .build();

        Set<ConstraintViolation<TaskRequestDto>> violations = validator.validate(dto);

        assertThat(violations).hasSize(1);
        assertThat(violations.iterator().next().getPropertyPath().toString()).isEqualTo("dueDate");
    }
}
