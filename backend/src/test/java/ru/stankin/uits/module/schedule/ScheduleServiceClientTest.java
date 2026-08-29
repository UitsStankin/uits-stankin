package ru.stankin.uits.module.schedule;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import ru.stankin.uits.common.exception.InvalidFileException;
import ru.stankin.uits.common.exception.ScheduleServiceUnavailableException;
import ru.stankin.uits.module.schedule.client.ScheduleServiceClient;
import ru.stankin.uits.module.schedule.dto.ParsedLessonDto;
import ru.stankin.uits.module.schedule.dto.ParsedScheduleDto;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class ScheduleServiceClientTest {

    private static final String BODY = """
            {"lessons": [
              {"week_day": 1, "class_time": 1, "group": "ИДБ-25-11",
               "name": "Технические средства информационных систем",
               "type": "Лабораторная", "subgroup": "Б", "cabinet": "216",
               "dates": [{"start": "16.03", "end": "27.04", "every_other_week": true}]}
            ]}
            """;

    private MockRestServiceServer server;
    private ScheduleServiceClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://schedule-service:8000");
        server = MockRestServiceServer.bindTo(builder).build();
        client = new ScheduleServiceClient(builder.build(), JsonMapper.builder().build());
    }

    private void expectParse(org.springframework.test.web.client.ResponseCreator response) {
        server.expect(requestTo("http://schedule-service:8000/parse"))
                .andExpect(method(org.springframework.http.HttpMethod.POST))
                .andExpect(content().contentTypeCompatibleWith(MediaType.MULTIPART_FORM_DATA))
                .andRespond(response);
    }

    @Test
    void mapsSnakeCaseResponseToDto() {
        expectParse(withSuccess(BODY, MediaType.APPLICATION_JSON));

        ParsedScheduleDto parsed = client.parse("pdf".getBytes(), "chekanin.pdf");

        assertThat(parsed.getLessons()).hasSize(1);
        ParsedLessonDto lesson = parsed.getLessons().getFirst();
        assertThat(lesson.getWeekDay()).isEqualTo(1);
        assertThat(lesson.getClassTime()).isEqualTo(1);
        assertThat(lesson.getGroup()).isEqualTo("ИДБ-25-11");
        assertThat(lesson.getSubgroup()).isEqualTo("Б");
        assertThat(lesson.getDates()).hasSize(1);
        assertThat(lesson.getDates().getFirst().getEveryOtherWeek()).isTrue();
        server.verify();
    }

    @Test
    void sendsFileAsMultipartFieldWithFilename() {
        expectParse(withSuccess(BODY, MediaType.APPLICATION_JSON));

        client.parse("pdf-bytes".getBytes(), "chekanin.pdf");

        server.verify();
    }

    @Test
    void unparsableFileBecomesInvalidFileExceptionWithServiceDetail() {
        expectParse(withStatus(HttpStatus.UNPROCESSABLE_ENTITY)
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"error\": \"schedule_parse_error\", \"detail\": \"в PDF не найдено ни одной таблицы расписания\"}"));

        assertThatThrownBy(() -> client.parse("pdf".getBytes(), "wrong.pdf"))
                .isInstanceOf(InvalidFileException.class)
                .hasMessage("в PDF не найдено ни одной таблицы расписания");
    }

    @Test
    void tooLargeFileBecomesInvalidFileException() {
        expectParse(withStatus(HttpStatus.CONTENT_TOO_LARGE)
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"error\": \"file_too_large\", \"detail\": \"файл больше допустимых 5 МБ\"}"));

        assertThatThrownBy(() -> client.parse("pdf".getBytes(), "huge.pdf"))
                .isInstanceOf(InvalidFileException.class);
    }

    @Test
    void serviceErrorBecomesUnavailable() {
        expectParse(withStatus(HttpStatus.INTERNAL_SERVER_ERROR)
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"error\": \"internal_error\", \"detail\": \"внутренняя ошибка сервиса\"}"));

        assertThatThrownBy(() -> client.parse("pdf".getBytes(), "chekanin.pdf"))
                .isInstanceOf(ScheduleServiceUnavailableException.class);
    }

    @Test
    void ourOwnBadRequestIsNotShownAsFileProblem() {
        expectParse(withStatus(HttpStatus.BAD_REQUEST)
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"error\": \"invalid_request\", \"detail\": \"ожидается multipart-поле file с PDF-файлом\"}"));

        assertThatThrownBy(() -> client.parse("pdf".getBytes(), "chekanin.pdf"))
                .isInstanceOf(ScheduleServiceUnavailableException.class);
    }

    @Test
    void connectionFailureBecomesUnavailable() {
        expectParse(withException(new IOException("connection refused")));

        assertThatThrownBy(() -> client.parse("pdf".getBytes(), "chekanin.pdf"))
                .isInstanceOf(ScheduleServiceUnavailableException.class)
                .hasMessageContaining("не отвечает");
    }

    @Test
    void brokenErrorBodyStillGivesReadableMessage() {
        expectParse(withStatus(HttpStatus.UNPROCESSABLE_ENTITY)
                .contentType(MediaType.APPLICATION_JSON)
                .body("не json вовсе"));

        assertThatThrownBy(() -> client.parse("pdf".getBytes(), "chekanin.pdf"))
                .isInstanceOf(InvalidFileException.class)
                .hasMessage("Не удалось разобрать файл расписания.");
    }
}
