package ru.stankin.uits.module.news.dto;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class ConferenceDatesValidator
        implements ConstraintValidator<ConferenceDatesConsistent, ConferenceRequestDto> {

    @Override
    public boolean isValid(ConferenceRequestDto dto, ConstraintValidatorContext context) {
        if (dto == null) {
            return true;
        }

        context.disableDefaultConstraintViolation();
        boolean valid = true;

        if (dto.getStartDate() == null) {
            if (dto.getEndDate() != null) {
                reject(context, "endDate", "Дата окончания указана без даты начала");
                valid = false;
            }
            if (dto.getTime() != null) {
                reject(context, "time", "Время начала указано без даты начала");
                valid = false;
            }
        } else if (dto.getEndDate() != null && dto.getEndDate().isBefore(dto.getStartDate())) {
            reject(context, "endDate", "Дата окончания раньше даты начала");
            valid = false;
        }

        return valid;
    }

    private void reject(ConstraintValidatorContext context, String field, String message) {
        context.buildConstraintViolationWithTemplate(message)
                .addPropertyNode(field)
                .addConstraintViolation();
    }
}
