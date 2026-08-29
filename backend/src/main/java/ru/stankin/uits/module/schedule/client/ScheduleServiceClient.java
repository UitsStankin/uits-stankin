package ru.stankin.uits.module.schedule.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.util.StreamUtils;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import ru.stankin.uits.common.exception.InvalidFileException;
import ru.stankin.uits.common.exception.ScheduleServiceUnavailableException;
import ru.stankin.uits.module.schedule.dto.ParsedScheduleDto;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@Component
public class ScheduleServiceClient {

    private static final Logger log = LoggerFactory.getLogger(ScheduleServiceClient.class);

    private static final int UNPROCESSABLE_CONTENT = 422;
    private static final int CONTENT_TOO_LARGE = 413;

    private final RestClient restClient;
    private final JsonMapper jsonMapper;

    public ScheduleServiceClient(RestClient scheduleServiceRestClient, JsonMapper jsonMapper) {
        this.restClient = scheduleServiceRestClient;
        this.jsonMapper = jsonMapper;
    }

    public ParsedScheduleDto parse(byte[] pdf, String filename) {
        try {
            return restClient.post()
                    .uri("/parse")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(multipartBody(pdf, filename))
                    .retrieve()
                    .onStatus(status -> status.isError(), (request, response) -> translate(response))
                    .body(ParsedScheduleDto.class);
        } catch (ResourceAccessException e) {
            throw new ScheduleServiceUnavailableException("Сервис разбора расписания не отвечает.", e);
        }
    }

    private MultiValueMap<String, Object> multipartBody(byte[] pdf, String filename) {
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", new ByteArrayResource(pdf) {
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
            throw new InvalidFileException("Файл расписания слишком велик для разбора.");
        }
        throw new ScheduleServiceUnavailableException("Сервис разбора расписания недоступен.");
    }

    private String readDetail(ClientHttpResponse response) throws IOException {
        String raw = StreamUtils.copyToString(response.getBody(), StandardCharsets.UTF_8);
        try {
            String detail = jsonMapper.readTree(raw).path("detail").asString();
            return detail.isBlank() ? "Не удалось разобрать файл расписания." : detail;
        } catch (RuntimeException e) {
            return "Не удалось разобрать файл расписания.";
        }
    }
}
