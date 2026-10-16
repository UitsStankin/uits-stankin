package ru.stankin.uits.common.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Поле обязано остаться непустым после {@link HtmlSanitizer}. Обычный
 * {@code @NotBlank} проверяет строку до чистки, поэтому тело из одной небезопасной
 * разметки проходит валидацию и сохраняется как пустое.
 */
@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = SafeHtmlNotBlankValidator.class)
public @interface SafeHtmlNotBlank {

    String message() default "Текст пуст после удаления небезопасной разметки";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
