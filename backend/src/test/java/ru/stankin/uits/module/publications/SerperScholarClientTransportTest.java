package ru.stankin.uits.module.publications;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;
import ru.stankin.uits.common.exception.ScholarUnavailableException;
import ru.stankin.uits.module.publications.client.SerperClientConfig;
import ru.stankin.uits.module.publications.client.SerperScholarClient;
import ru.stankin.uits.module.publications.client.SerperScholarItem;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SerperScholarClientTransportTest {

    private static final String API_KEY = "test-key";

    private HttpServer server;
    private final AtomicReference<Map<String, List<String>>> requestHeaders = new AtomicReference<>();
    private final AtomicReference<String> requestBody = new AtomicReference<>();

    @BeforeEach
    void startServer() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/scholar", this::respond);
        server.start();
    }

    @AfterEach
    void stopServer() {
        server.stop(0);
    }

    private void respond(HttpExchange exchange) throws IOException {
        requestHeaders.set(Map.copyOf(exchange.getRequestHeaders()));
        requestBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));

        byte[] body = "{\"organic\":[{\"title\":\"A\"},{\"title\":\"B\"}]}".getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().add("Content-Type", "application/json");
        exchange.sendResponseHeaders(200, body.length);
        exchange.getResponseBody().write(body);
        exchange.close();
    }

    private SerperScholarClient client(String apiKey) {
        return new SerperScholarClient(restClient(server.getAddress().getPort(), Duration.ofSeconds(10)), apiKey);
    }

    private RestClient restClient(int port, Duration readTimeout) {
        return new SerperClientConfig().serperRestClient(
                RestClient.builder(),
                "http://127.0.0.1:" + port,
                Duration.ofSeconds(3),
                readTimeout);
    }

    @Test
    void sendsKeyAndQueryInBody() {
        client(API_KEY).search("Чеканин", 0);

        assertThat(requestHeaders.get().get("X-api-key")).containsExactly(API_KEY);
        assertThat(requestBody.get())
                .contains("\"q\":\"Чеканин\"")
                .contains("\"hl\":\"ru\"")
                .contains("\"page\":1");
    }

    @Test
    void returnsItemsFromOrganic() {
        List<SerperScholarItem> items = client(API_KEY).search("Чеканин", 0);

        assertThat(items).hasSize(2);
        assertThat(items.getFirst().getTitle()).isEqualTo("A");
    }

    @Test
    void errorStatusBecomesScholarUnavailable() throws IOException {
        HttpServer failing = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        failing.createContext("/scholar", exchange -> {
            byte[] body = "upstream request timeout".getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "text/plain");
            exchange.sendResponseHeaders(504, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
        failing.start();

        try {
            SerperScholarClient client = new SerperScholarClient(
                    restClient(failing.getAddress().getPort(), Duration.ofSeconds(10)), API_KEY);

            assertThatThrownBy(() -> client.search("Чеканин", 0))
                    .isInstanceOf(ScholarUnavailableException.class);
        } finally {
            failing.stop(0);
        }
    }

    @Test
    void readTimeoutBecomesScholarUnavailable() throws IOException {
        HttpServer slow = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        slow.createContext("/scholar", exchange -> {
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
            SerperScholarClient client = new SerperScholarClient(
                    restClient(slow.getAddress().getPort(), Duration.ofMillis(200)), API_KEY);

            assertThatThrownBy(() -> client.search("Чеканин", 0))
                    .isInstanceOf(ScholarUnavailableException.class);
        } finally {
            slow.stop(0);
        }
    }

    @Test
    void blankKeyFailsWithoutRequest() {
        assertThatThrownBy(() -> client("").search("Чеканин", 0))
                .isInstanceOf(ScholarUnavailableException.class);

        assertThat(requestBody.get()).isNull();
    }
}
