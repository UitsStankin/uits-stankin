package ru.stankin.uits.common.exception;

import org.junit.jupiter.api.Test;
import org.springframework.beans.TypeMismatchException;
import org.springframework.dao.InvalidDataAccessApiUsageException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.mock.http.MockHttpInputMessage;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;

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

    @Test
    void tooManyRequests_CarriesRetryAfterHeader() {
        ResponseEntity<ProblemDetail> response = handler.handleTooManyRequests(
                new TooManyRequestsException("Повторите через 12 с.", 12));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
        assertThat(response.getHeaders().getFirst(HttpHeaders.RETRY_AFTER)).isEqualTo("12");
        assertThat(response.getBody().getDetail()).isEqualTo("Повторите через 12 с.");
    }

    @Test
    void missingRequestParameter_ReturnsRussianDetail() {
        MissingServletRequestParameterException ex = new MissingServletRequestParameterException("q", "String");

        ResponseEntity<Object> response = handler.handleMissingServletRequestParameter(
                ex, new HttpHeaders(), HttpStatus.BAD_REQUEST, null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(((ProblemDetail) response.getBody()).getDetail())
                .isEqualTo("Не передан обязательный параметр «q».");
    }

    @Test
    void missingRequestPart_ReturnsRussianDetail() {
        MissingServletRequestPartException ex = new MissingServletRequestPartException("file");

        ResponseEntity<Object> response = handler.handleMissingServletRequestPart(
                ex, new HttpHeaders(), HttpStatus.BAD_REQUEST, null);

        assertThat(((ProblemDetail) response.getBody()).getDetail())
                .isEqualTo("Не передана обязательная часть запроса «file».");
    }

    @Test
    void typeMismatch_ReturnsRussianDetailWithoutEchoingValue() {
        TypeMismatchException ex = new TypeMismatchException("abc", Integer.class);
        ex.initPropertyName("page");

        ResponseEntity<Object> response = handler.handleTypeMismatch(
                ex, new HttpHeaders(), HttpStatus.BAD_REQUEST, null);

        assertThat(((ProblemDetail) response.getBody()).getDetail())
                .isEqualTo("Параметр «page» имеет неверное значение.");
    }

    @Test
    void unreadableBody_ReturnsRussianDetail() {
        HttpMessageNotReadableException ex = new HttpMessageNotReadableException(
                "JSON parse error", new MockHttpInputMessage(new byte[0]));

        ResponseEntity<Object> response = handler.handleHttpMessageNotReadable(
                ex, new HttpHeaders(), HttpStatus.BAD_REQUEST, null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(((ProblemDetail) response.getBody()).getDetail())
                .startsWith("Тело запроса не удалось прочитать");
    }
}
