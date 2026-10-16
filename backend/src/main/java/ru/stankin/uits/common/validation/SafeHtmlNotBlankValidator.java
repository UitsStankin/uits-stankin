package ru.stankin.uits.common.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class SafeHtmlNotBlankValidator implements ConstraintValidator<SafeHtmlNotBlank, String> {

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null || value.isBlank()) {
            return true;
        }

        return !HtmlSanitizer.sanitize(value).isBlank();
    }
}
