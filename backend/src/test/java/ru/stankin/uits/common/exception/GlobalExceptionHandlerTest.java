package ru.stankin.uits.common.exception;

import org.junit.jupiter.api.Test;
import org.springframework.dao.InvalidDataAccessApiUsageException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void invalidDataAccessApiUsage_SortExpression_Returns400() {
        InvalidDataAccessApiUsageException ex = new InvalidDataAccessApiUsageException(
                "Sort expression 'password: ASC' must not contain functions");

        ProblemDetail problem = handler.handleInvalidDataAccessApiUsage(ex);

        assertThat(problem.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST.value());
        assertThat(problem.getDetail()).isEqualTo("Недопустимое поле сортировки.");
    }

    @Test
    void invalidDataAccessApiUsage_OtherCause_Returns500WithoutExceptionMessage() {
        InvalidDataAccessApiUsageException ex = new InvalidDataAccessApiUsageException(
                "секретный-маркер-12345");

        ProblemDetail problem = handler.handleInvalidDataAccessApiUsage(ex);

        assertThat(problem.getStatus()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR.value());
        assertThat(problem.getDetail()).isEqualTo("Внутренняя ошибка сервера.");
    }
}
