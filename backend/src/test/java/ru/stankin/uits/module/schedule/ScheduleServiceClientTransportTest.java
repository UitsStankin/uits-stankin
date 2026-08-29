package ru.stankin.uits.module.schedule;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;
import ru.stankin.uits.common.exception.ScheduleServiceUnavailableException;
import ru.stankin.uits.module.schedule.client.ScheduleServiceClient;
import ru.stankin.uits.module.schedule.client.ScheduleServiceClientConfig;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ScheduleServiceClientTransportTest {

    private HttpServer server;
    private final AtomicReference<Map<String, List<String>>> requestHeaders = new AtomicReference<>();
    private final AtomicReference<String> requestBody = new AtomicReference<>();

    @BeforeEach
    void startServer() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/parse", this::respond);
        server.start();
    }

    @AfterEach
    void stopServer() {
        server.stop(0);
    }

    private void respond(HttpExchange exchange) throws IOException {
        requestHeaders.set(Map.copyOf(exchange.getRequestHeaders()));
        requestBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));

        byte[] body = "{\"lessons\": []}".getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().add("Content-Type", "application/json");
        exchange.sendResponseHeaders(200, body.length);
        exchange.getResponseBody().write(body);
        exchange.close();
    }

    private ScheduleServiceClient client() {
        RestClient restClient = new ScheduleServiceClientConfig().scheduleServiceRestClient(
                RestClient.builder(),
                "http://127.0.0.1:" + server.getAddress().getPort(),
                Duration.ofSeconds(3),
                Duration.ofSeconds(10));

        return new ScheduleServiceClient(restClient, JsonMapper.builder().build());
    }

    @Test
    void doesNotAskToUpgradeProtocol() {
        client().parse("%PDF-1.4".getBytes(StandardCharsets.UTF_8), "chekanin.pdf");

        assertThat(requestHeaders.get()).doesNotContainKey("Upgrade");
        assertThat(requestHeaders.get()).doesNotContainKey("Http2-settings");
    }

    @Test
    void readTimeoutBecomesServiceUnavailable() throws IOException {
        HttpServer slow = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        slow.createContext("/parse", exchange -> {
            try {
                Thread.sleep(2000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            exchange.sendResponseHeaders(200, 0);
            exchange.close();
        });
        slow.start();

        try {
            RestClient restClient = new ScheduleServiceClientConfig().scheduleServiceRestClient(
                    RestClient.builder(),
                    "http://127.0.0.1:" + slow.getAddress().getPort(),
                    Duration.ofSeconds(3),
                    Duration.ofMillis(200));
            ScheduleServiceClient client = new ScheduleServiceClient(restClient, JsonMapper.builder().build());

            assertThatThrownBy(() -> client.parse("%PDF-1.4".getBytes(StandardCharsets.UTF_8), "chekanin.pdf"))
                    .isInstanceOf(ScheduleServiceUnavailableException.class);
        } finally {
            slow.stop(0);
        }
    }

    @Test
    void sendsFileAsMultipartPartWithFilename() {
        client().parse("%PDF-1.4".getBytes(StandardCharsets.UTF_8), "chekanin.pdf");

        assertThat(requestHeaders.get().get("Content-type").getFirst())
                .startsWith("multipart/form-data")
                .contains("boundary=");
        assertThat(requestBody.get())
                .contains("name=\"file\"")
                .contains("filename=\"chekanin.pdf\"")
                .contains("%PDF-1.4");
    }
}
