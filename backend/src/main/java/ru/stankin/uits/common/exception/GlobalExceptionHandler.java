package ru.stankin.uits.common.exception;

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
import org.springframework.web.multipart.MaxUploadSizeExceededException;
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

        ProblemDetail problem = problemDetail(HttpStatus.BAD_REQUEST, "Ошибка валидации.");
        problem.setTitle("Ошибка валидации");
        problem.setProperty("errors", errors);

        return ResponseEntity.of(problem).build();
    }

    @ExceptionHandler(InvalidOldPasswordException.class)
    public ProblemDetail handleInvalidOldPassword(InvalidOldPasswordException ex) {
        return problemDetail(HttpStatus.BAD_REQUEST, "Старый пароль введён неверно.");
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ProblemDetail handleAccessDenied(AccessDeniedException ex) {
        return problemDetail(HttpStatus.FORBIDDEN, "Недостаточно прав.");
    }

    @ExceptionHandler(NotFoundException.class)
    public ProblemDetail handleNotFound(NotFoundException ex) {
        return problemDetail(HttpStatus.NOT_FOUND, "Ресурс не найден.");
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ProblemDetail handleDataIntegrityViolation(DataIntegrityViolationException ex) {
        return problemDetail(HttpStatus.CONFLICT, "Конфликт данных.");
    }

    @ExceptionHandler({BadCredentialsException.class, AccountStatusException.class})
    public ProblemDetail handleAuthenticationFailure(AuthenticationException ex) {
        log.warn("Отказ в аутентификации: {}", ex.getClass().getSimpleName());

        return problemDetail(HttpStatus.UNAUTHORIZED, "Неверный логин или пароль.");
    }

    @ExceptionHandler(InvalidRefreshTokenException.class)
    public ProblemDetail handleInvalidRefreshToken(InvalidRefreshTokenException ex) {
        log.warn("Отказ в обновлении сессии: {}", ex.getMessage());

        return problemDetail(HttpStatus.UNAUTHORIZED, "Сессия недействительна. Требуется повторный вход.");
    }

    @ExceptionHandler(PropertyReferenceException.class)
    public ProblemDetail handlePropertyReference(PropertyReferenceException ex) {
        return problemDetail(HttpStatus.BAD_REQUEST,
                "Неизвестное поле сортировки: " + ex.getPropertyName() + ".");
    }

    @ExceptionHandler(Exception.class)
    public ProblemDetail handleUnexpected(Exception ex) {
        log.error("Необработанное исключение", ex);

        return problemDetail(HttpStatus.INTERNAL_SERVER_ERROR, "Внутренняя ошибка сервера.");
    }

    @ExceptionHandler(InvalidFileException.class)
    public ProblemDetail handleInvalidFile(InvalidFileException ex) {
        return problemDetail(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(ScheduleServiceUnavailableException.class)
    public ProblemDetail handleScheduleServiceUnavailable(ScheduleServiceUnavailableException ex) {
        return problemDetail(HttpStatus.SERVICE_UNAVAILABLE, ex.getMessage());
    }

    @ExceptionHandler(InvalidRequestException.class)
    public ProblemDetail handleInvalidRequest(InvalidRequestException ex) {
        return problemDetail(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @Override
    protected @Nullable ResponseEntity<Object> handleMaxUploadSizeExceededException(MaxUploadSizeExceededException ex,
                                                                                    HttpHeaders headers,
                                                                                    HttpStatusCode status,
                                                                                    WebRequest request) {
        ProblemDetail problem = problemDetail(HttpStatus.CONTENT_TOO_LARGE, "Файл превышает допустимый размер.");
        problem.setTitle("Файл слишком большой");

        return ResponseEntity.of(problem).build();
    }

    private ProblemDetail problemDetail(HttpStatus status, String detail) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setProperty("timestamp", Instant.now());
        return problem;
    }
}
