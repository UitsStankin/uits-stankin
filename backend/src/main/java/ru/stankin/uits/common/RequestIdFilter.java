package ru.stankin.uits.common;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.NonNull;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Slf4j
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestIdFilter extends OncePerRequestFilter {

    public static final String HEADER_NAME = "X-Request-Id";

    private static final String MDC_KEY = "requestId";

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String apiPath = request.getContextPath() + "/api";
        String path = request.getRequestURI();
        return !path.equals(apiPath) && !path.startsWith(apiPath + "/");
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        // Входящий заголовок может прислать сам клиент. Идентификатор назначает приложение.
        String requestId = UUID.randomUUID().toString();
        long startedAt = System.nanoTime();
        response.setHeader(HEADER_NAME, requestId);
        MDC.put(MDC_KEY, requestId);
        try {
            filterChain.doFilter(request, response);
            log.atInfo()
                    .addKeyValue("method", request.getMethod())
                    .addKeyValue("status", response.getStatus())
                    .addKeyValue("durationMs", TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startedAt))
                    .log("API request completed");
        } finally {
            MDC.remove(MDC_KEY);
        }
    }
}
