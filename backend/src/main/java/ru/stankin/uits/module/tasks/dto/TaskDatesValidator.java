package ru.stankin.uits.module.tasks.dto;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class TaskDatesValidator implements ConstraintValidator<TaskDatesConsistent, TaskRequestDto> {

    @Override
    public boolean isValid(TaskRequestDto dto, ConstraintValidatorContext context) {
        if (dto == null) {
            return true;
        }

        if (dto.getStartDate() != null
                && dto.getDueDate() != null
                && dto.getDueDate().isBefore(dto.getStartDate())) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate("Срок выполнения не может быть раньше даты начала")
                    .addPropertyNode("dueDate")
                    .addConstraintViolation();
            return false;
        }

        return true;
    }
}
