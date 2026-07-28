package ru.stankin.uits.common;

import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.Nullable;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.core.PropertyReferenceException;
import org.springframework.http.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AccountStatusException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    @Override
    protected @Nullable ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex,
                                                                            HttpHeaders headers,
                                                                            HttpStatusCode status,
                                                                            WebRequest request) {
        List<FieldError> fieldErrors = ex.getBindingResult().getFieldErrors();
        Map<String, List<String>> errors = new HashMap<>();

        for (FieldError fieldError : fieldErrors) {
            if (!errors.containsKey(fieldError.getField())) {
                errors.put(fieldError.getField(), new ArrayList<>());
            }
            errors.get(fieldError.getField()).add(fieldError.getDefaultMessage());
        }

        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST,
                "Ошибка валидации."
        );
        problem.setTitle("Ошибка валидации");
        problem.setProperty("errors", errors);

        return ResponseEntity.of(problem).build();
    }

    @ExceptionHandler(InvalidOldPasswordException.class)
    public ProblemDetail handleInvalidOldPassword(InvalidOldPasswordException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST,
                "Старый пароль введён неверно."
        );

        problem.setProperty("timestamp", Instant.now());

        return problem;
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ProblemDetail handleAccessDenied(AccessDeniedException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.FORBIDDEN,
                "Недостаточно прав."
        );

        problem.setProperty("timestamp", Instant.now());

        return problem;
    }

    @ExceptionHandler(NotFoundException.class)
    public ProblemDetail handleNotFound(NotFoundException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.NOT_FOUND,
                "Ресурс не найден."
        );

        problem.setProperty("timestamp", Instant.now());

        return problem;
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ProblemDetail handleDataIntegrityViolation(DataIntegrityViolationException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.CONFLICT,
                "Конфликт данных."
        );

        problem.setProperty("timestamp", Instant.now());

        return problem;
    }

    @ExceptionHandler({BadCredentialsException.class, AccountStatusException.class})
    public ProblemDetail handleAuthenticationFailure(AuthenticationException ex) {
        log.warn("Отказ в аутентификации: {}", ex.getClass().getSimpleName());

        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.UNAUTHORIZED,
                "Неверный логин или пароль."
        );

        problem.setProperty("timestamp", Instant.now());

        return problem;
    }

    @ExceptionHandler(PropertyReferenceException.class)
    public ProblemDetail handlePropertyReference(PropertyReferenceException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST,
                "Неизвестное поле сортировки: " + ex.getPropertyName() + "."
        );

        problem.setProperty("timestamp", Instant.now());

        return problem;
    }


    @ExceptionHandler(Exception.class)
    public ProblemDetail handleUnexpected(Exception ex) {
        log.error("Необработанное исключение", ex);

        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Внутренняя ошибка сервера."
        );

        problem.setProperty("timestamp", Instant.now());

        return problem;
    }
}
