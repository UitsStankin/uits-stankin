package ru.stankin.uits.common.client;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import ru.stankin.uits.common.exception.InvalidFileException;
import ru.stankin.uits.common.exception.ScheduleServiceUnavailableException;
import tools.jackson.databind.json.JsonMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;

class ParsingServiceClientLoggingTest {

    private static final byte[] FILE = "pdf".getBytes(java.nio.charset.StandardCharsets.UTF_8);

    private final Logger clientLogger = (Logger) LoggerFactory.getLogger(ParsingServiceClient.class);
    private final ListAppender<ILoggingEvent> appender = new ListAppender<>();

    private MockRestServiceServer server;
    private ParsingServiceClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://schedule-service:8000");
        server = MockRestServiceServer.bindTo(builder).build();
        client = new ParsingServiceClient(builder.build(), JsonMapper.builder().build(), "расписания");
        appender.start();
        clientLogger.addAppender(appender);
    }

    @AfterEach
    void tearDown() {
        clientLogger.detachAppender(appender);
    }

    @Test
    void rejectedFileIsLoggedAsWarning() {
        server.expect(requestTo("http://schedule-service:8000/parse"))
                .andRespond(withStatus(HttpStatus.UNPROCESSABLE_ENTITY)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"detail\": \"файл не удалось прочитать как PDF\"}"));

        assertThatThrownBy(() -> client.parse("/parse", FILE, "a.pdf", Object.class))
                .isInstanceOf(InvalidFileException.class);

        assertThat(appender.list).singleElement().satisfies(event -> {
            assertThat(event.getLevel()).isEqualTo(Level.WARN);
            assertThat(event.getFormattedMessage()).contains("422").contains("файл не удалось прочитать как PDF");
        });
    }

    @Test
    void oversizedFileIsLoggedAsWarning() {
        server.expect(requestTo("http://schedule-service:8000/parse"))
                .andRespond(withStatus(HttpStatus.CONTENT_TOO_LARGE));

        assertThatThrownBy(() -> client.parse("/parse", FILE, "a.pdf", Object.class))
                .isInstanceOf(InvalidFileException.class);

        assertThat(appender.list).singleElement()
                .extracting(ILoggingEvent::getLevel).isEqualTo(Level.WARN);
    }

    @Test
    void serviceFailureIsLoggedAsError() {
        server.expect(requestTo("http://schedule-service:8000/parse"))
                .andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR));

        assertThatThrownBy(() -> client.parse("/parse", FILE, "a.pdf", Object.class))
                .isInstanceOf(ScheduleServiceUnavailableException.class);

        assertThat(appender.list).singleElement()
                .extracting(ILoggingEvent::getLevel).isEqualTo(Level.ERROR);
    }
}
