package ru.stankin.uits.common.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = BcryptCompatibleValidator.class)
public @interface BcryptCompatible {

    String message() default "Пароль длиннее 72 байт в UTF-8";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
