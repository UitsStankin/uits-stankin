package ru.stankin.uits.security;

import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.NonNull;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.SequenceInputStream;
import java.net.URI;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

@Slf4j
@Component
public class LoginRateLimitFilter extends OncePerRequestFilter {

    private static final RequestMatcher LOGIN_MATCHER =
            PathPatternRequestMatcher.withDefaults().matcher(HttpMethod.POST, "/api/users/auth/login");

    private static final String IP_KEY_PREFIX = "ip:";
    private static final String USERNAME_KEY_PREFIX = "user:";

    // Тело логина — крошечный JSON; всё, что больше, кэшировать в память не стоит,
    // такой запрос ограничивается только ведром по IP.
    private static final int MAX_CACHED_BODY_BYTES = 8 * 1024;

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper;
    private final long capacity;
    private final long usernameCapacity;
    private final Duration period;

    public LoginRateLimitFilter(
            ObjectMapper objectMapper,
            @Value("${application.security.login-rate-limit.attempts}") long capacity,
            @Value("${application.security.login-rate-limit.username-attempts}") long usernameCapacity,
            @Value("${application.security.login-rate-limit.period}") long periodMillis
    ) {
        this.objectMapper = objectMapper;
        this.capacity = capacity;
        this.usernameCapacity = usernameCapacity;
        this.period = Duration.ofMillis(periodMillis);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !LOGIN_MATCHER.matches(request);
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        Bucket ipBucket = buckets.computeIfAbsent(IP_KEY_PREFIX + request.getRemoteAddr(),
                key -> newBucket(capacity));
        ConsumptionProbe ipProbe = ipBucket.tryConsumeAndReturnRemaining(1);

        if (!ipProbe.isConsumed()) {
            log.warn("Превышен лимит попыток входа с адреса {}", request.getRemoteAddr());
            writeTooManyRequests(request, response, retryAfterSeconds(ipProbe));
            return;
        }

        CachedBodyRequest effectiveRequest = new CachedBodyRequest(request);

        if (!effectiveRequest.overflow()) {
            String username = extractUsername(effectiveRequest.body());

            if (username != null) {
                Bucket usernameBucket = buckets.computeIfAbsent(USERNAME_KEY_PREFIX + username,
                        key -> newBucket(usernameCapacity));
                ConsumptionProbe usernameProbe = usernameBucket.tryConsumeAndReturnRemaining(1);

                if (!usernameProbe.isConsumed()) {
                    log.warn("Превышен лимит попыток входа в учётную запись {}", username);
                    writeTooManyRequests(request, response, retryAfterSeconds(usernameProbe));
                    return;
                }
            }
        }

        filterChain.doFilter(effectiveRequest, response);
    }

    @Scheduled(cron = "${application.security.login-rate-limit.eviction-cron}")
    public void evictIdleBuckets() {
        buckets.entrySet().removeIf(entry -> entry.getValue().getAvailableTokens() >= capacityFor(entry.getKey()));
    }

    private long capacityFor(String key) {
        return key.startsWith(USERNAME_KEY_PREFIX) ? usernameCapacity : capacity;
    }

    private Bucket newBucket(long bucketCapacity) {
        return Bucket.builder()
                .addLimit(limit -> limit.capacity(bucketCapacity).refillGreedy(bucketCapacity, period))
                .build();
    }

    private String extractUsername(byte[] body) {
        try {
            String username = objectMapper.readTree(body).path("username").asString("");
            username = username.trim().toLowerCase(Locale.ROOT);

            return username.isEmpty() ? null : username;
        } catch (JacksonException e) {
            return null;
        }
    }

    private static long retryAfterSeconds(ConsumptionProbe probe) {
        return Math.max(1, TimeUnit.NANOSECONDS.toSeconds(probe.getNanosToWaitForRefill()));
    }

    private void writeTooManyRequests(
            HttpServletRequest request,
            HttpServletResponse response,
            long retryAfterSeconds
    ) throws IOException {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.TOO_MANY_REQUESTS,
                "Слишком много попыток входа. Повторите позже.");

        problem.setInstance(URI.create(request.getRequestURI()));
        problem.setProperty("timestamp", Instant.now());

        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setHeader(HttpHeaders.RETRY_AFTER, String.valueOf(retryAfterSeconds));

        objectMapper.writeValue(response.getWriter(), problem);
    }

    private static final class CachedBodyRequest extends HttpServletRequestWrapper {

        private final byte[] body;

        // Content-Length ненадёжен: chunked-запрос приходит без него. Тело
        // читается до порога всегда; хвост сверх порога остаётся в исходном
        // потоке и досылается вниз склейкой.
        CachedBodyRequest(HttpServletRequest request) throws IOException {
            super(request);
            this.body = request.getInputStream().readNBytes(MAX_CACHED_BODY_BYTES + 1);
        }

        byte[] body() {
            return body;
        }

        boolean overflow() {
            return body.length > MAX_CACHED_BODY_BYTES;
        }

        @Override
        public ServletInputStream getInputStream() throws IOException {
            InputStream cached = new ByteArrayInputStream(body);
            InputStream delegate = overflow()
                    ? new SequenceInputStream(cached, ((HttpServletRequest) getRequest()).getInputStream())
                    : cached;

            return new ServletInputStream() {
                private boolean finished;

                @Override
                public boolean isFinished() {
                    return finished;
                }

                @Override
                public boolean isReady() {
                    return true;
                }

                @Override
                public void setReadListener(ReadListener readListener) {
                    throw new UnsupportedOperationException();
                }

                @Override
                public int read() throws IOException {
                    int value = delegate.read();
                    finished = value == -1;
                    return value;
                }

                @Override
                public int read(byte[] b, int off, int len) throws IOException {
                    int count = delegate.read(b, off, len);
                    finished = count == -1;
                    return count;
                }
            };
        }

        @Override
        public BufferedReader getReader() throws IOException {
            String encoding = getCharacterEncoding();
            Charset charset = encoding != null ? Charset.forName(encoding) : StandardCharsets.UTF_8;

            return new BufferedReader(new InputStreamReader(getInputStream(), charset));
        }
    }
}
