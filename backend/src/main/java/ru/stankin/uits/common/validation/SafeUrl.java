package ru.stankin.uits.common.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = SafeUrlValidator.class)
public @interface SafeUrl {

    String message() default "Ссылка должна быть адресом http, https или путём внутри портала";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
