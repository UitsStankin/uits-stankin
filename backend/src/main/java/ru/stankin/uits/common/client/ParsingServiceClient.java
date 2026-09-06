package ru.stankin.uits.common.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.util.StreamUtils;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import ru.stankin.uits.common.exception.InvalidFileException;
import ru.stankin.uits.common.exception.ScheduleServiceUnavailableException;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * Общая половина клиентов к schedule-service: отправка multipart и перевод ответов
 * сервиса в исключения приложения. Ручек в сервисе три, и правила у них одни
 * ({@code schedule-service/README.md}); различаются только путь, тип ответа
 * и название документа в сообщениях.
 *
 * <p>{@code documentName} подставляется в текст ошибок и потому пишется
 * в родительном падеже: «расписания», «ведомости».
 */
public class ParsingServiceClient {

    private static final Logger log = LoggerFactory.getLogger(ParsingServiceClient.class);

    private static final int UNPROCESSABLE_CONTENT = 422;
    private static final int CONTENT_TOO_LARGE = 413;

    private final RestClient restClient;
    private final JsonMapper jsonMapper;
    private final String documentName;

    public ParsingServiceClient(RestClient restClient, JsonMapper jsonMapper, String documentName) {
        this.restClient = restClient;
        this.jsonMapper = jsonMapper;
        this.documentName = documentName;
    }

    public <T> T parse(String uri, byte[] file, String filename, Class<T> responseType) {
        try {
            return restClient.post()
                    .uri(uri)
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(multipartBody(file, filename))
                    .retrieve()
                    .onStatus(status -> status.isError(), (request, response) -> translate(response))
                    .body(responseType);
        } catch (ResourceAccessException e) {
            throw new ScheduleServiceUnavailableException(
                    "Сервис разбора " + documentName + " не отвечает.", e);
        }
    }

    private MultiValueMap<String, Object> multipartBody(byte[] file, String filename) {
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", new ByteArrayResource(file) {
            @Override
            public String getFilename() {
                return filename;
            }
        });
        return body;
    }

    private void translate(ClientHttpResponse response) throws IOException {
        int status = response.getStatusCode().value();
        String detail = readDetail(response);
        log.error("schedule-service ответил {}: {}", status, detail);

        if (status == UNPROCESSABLE_CONTENT) {
            throw new InvalidFileException(detail);
        }
        if (status == CONTENT_TOO_LARGE) {
            throw new InvalidFileException("Файл " + documentName + " слишком велик для разбора.");
        }
        throw new ScheduleServiceUnavailableException(
                "Сервис разбора " + documentName + " недоступен.");
    }

    private String readDetail(ClientHttpResponse response) throws IOException {
        String raw = StreamUtils.copyToString(response.getBody(), StandardCharsets.UTF_8);
        try {
            String detail = jsonMapper.readTree(raw).path("detail").asString();
            return detail.isBlank() ? fallbackDetail() : detail;
        } catch (RuntimeException e) {
            return fallbackDetail();
        }
    }

    private String fallbackDetail() {
        return "Не удалось разобрать файл " + documentName + ".";
    }
}
