package ru.stankin.uits.config;

import org.apache.catalina.connector.Request;
import org.apache.catalina.connector.Response;
import org.apache.catalina.valves.ErrorReportValve;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;

public class ProblemJsonErrorReportValve extends ErrorReportValve {

    private static final Logger log = LoggerFactory.getLogger(ProblemJsonErrorReportValve.class);

    @Override
    protected void report(Request request, Response response, Throwable throwable) {
        int status = response.getStatus();

        if (status < 400 || response.getContentWritten() > 0 || !response.setErrorReported()) {
            return;
        }

        byte[] body = problem(status).getBytes(StandardCharsets.UTF_8);

        try {
            response.setContentType("application/problem+json");
            response.setCharacterEncoding("UTF-8");
            response.setContentLength(body.length);
            response.getOutputStream().write(body);
            response.finishResponse();
        } catch (IOException | IllegalStateException e) {
            log.debug("Тело ошибки {} не записано: {}", status, e.getMessage());
        }
    }

    private String problem(int status) {
        return "{\"title\":\"" + title(status) + "\",\"status\":" + status
                + ",\"detail\":\"" + detail(status) + "\",\"timestamp\":\"" + Instant.now() + "\"}";
    }

    private String title(int status) {
        return switch (status) {
            case 400 -> "Bad Request";
            case 414 -> "URI Too Long";
            case 431 -> "Request Header Fields Too Large";
            case 404 -> "Not Found";
            case 405 -> "Method Not Allowed";
            default -> status >= 500 ? "Internal Server Error" : "Error";
        };
    }

    private String detail(int status) {
        return switch (status) {
            case 400 -> "Некорректный запрос.";
            case 414 -> "Слишком длинный адрес запроса.";
            case 431 -> "Слишком большие заголовки запроса.";
            case 404 -> "Ресурс не найден.";
            case 405 -> "Метод не поддерживается.";
            default -> status >= 500 ? "Внутренняя ошибка сервера." : "Запрос отклонён.";
        };
    }
}
