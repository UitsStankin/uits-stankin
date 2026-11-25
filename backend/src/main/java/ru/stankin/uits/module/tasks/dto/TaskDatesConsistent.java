package ru.stankin.uits.module.tasks.dto;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = TaskDatesValidator.class)
public @interface TaskDatesConsistent {

    String message() default "Некорректные даты задачи";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
