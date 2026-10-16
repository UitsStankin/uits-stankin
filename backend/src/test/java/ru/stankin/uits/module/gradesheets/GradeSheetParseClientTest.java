package ru.stankin.uits.module.gradesheets;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import ru.stankin.uits.common.exception.InvalidFileException;
import ru.stankin.uits.common.exception.ScheduleServiceUnavailableException;
import ru.stankin.uits.module.gradesheets.client.GradeSheetParseClient;
import ru.stankin.uits.module.gradesheets.dto.ParsedGradeSheetDto;
import ru.stankin.uits.module.gradesheets.dto.ParsedGradeSheetMarkDto;
import ru.stankin.uits.module.gradesheets.dto.ParsedGradeSheetStudentDto;
import ru.stankin.uits.module.gradesheets.dto.ParsedGradeSheetsDto;
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

class GradeSheetParseClientTest {

    private static final String BODY = """
            {"sheets": [
              {"sheet_name": "ИДБ-25-11", "group": "ИДБ-25-11",
               "discipline": "Технические средства информационных систем",
               "department": "УИТС", "teachers": ["Чеканин В.А.", "Ступивцев А.В."],
               "semester": "Весенний семестр 2025/2026 учебного года",
               "direction": "09.03.03 «Прикладная информатика»",
               "blocks": ["М1", "Зачёт"],
               "students": [
                 {"number": 1, "last_name": "Абрамов", "first_name": "Александр",
                  "patronymic": null,
                  "marks": [
                    {"block": "М1", "score": 30.0, "text": null, "grade": null,
                     "date": null, "teacher": null},
                    {"block": "Зачёт", "score": null, "text": "не допущен", "grade": null,
                     "date": "2026-06-06", "teacher": "Чеканин В.А."}
                  ]}
               ],
               "warnings": ["группа в шапке 'ИДБ-25-14' не совпадает с именем листа 'ИДБ-25-15'"]}
            ]}
            """;

    private MockRestServiceServer server;
    private GradeSheetParseClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://schedule-service:8000");
        server = MockRestServiceServer.bindTo(builder).build();
        client = new GradeSheetParseClient(builder.build(), JsonMapper.builder().build());
    }

    private void expectParse(org.springframework.test.web.client.ResponseCreator response) {
        server.expect(requestTo("http://schedule-service:8000/parse-gradesheet"))
                .andExpect(method(org.springframework.http.HttpMethod.POST))
                .andExpect(content().contentTypeCompatibleWith(MediaType.MULTIPART_FORM_DATA))
                .andRespond(response);
    }

    @Test
    void mapsSnakeCaseResponseToDto() {
        expectParse(withSuccess(BODY, MediaType.APPLICATION_JSON));

        ParsedGradeSheetsDto parsed = client.parse(new byte[]{1, 2, 3}, "gradesheet.xlsx");

        assertThat(parsed.getSheets()).hasSize(1);
        ParsedGradeSheetDto sheet = parsed.getSheets().getFirst();
        assertThat(sheet.getSheetName()).isEqualTo("ИДБ-25-11");
        assertThat(sheet.getTeachers()).containsExactly("Чеканин В.А.", "Ступивцев А.В.");
        assertThat(sheet.getBlocks()).containsExactly("М1", "Зачёт");
        assertThat(sheet.getWarnings()).hasSize(1);
        server.verify();
    }

    @Test
    void mapsStudentsAndMarks() {
        expectParse(withSuccess(BODY, MediaType.APPLICATION_JSON));

        ParsedGradeSheetStudentDto student =
                client.parse(new byte[]{1}, "gradesheet.xlsx").getSheets().getFirst()
                        .getStudents().getFirst();

        assertThat(student.getNumber()).isEqualTo(1);
        assertThat(student.getLastName()).isEqualTo("Абрамов");
        assertThat(student.getFirstName()).isEqualTo("Александр");
        assertThat(student.getPatronymic()).isNull();

        ParsedGradeSheetMarkDto score = student.getMarks().getFirst();
        assertThat(score.getBlock()).isEqualTo("М1");
        assertThat(score.getScore()).isEqualByComparingTo("30.0");

        ParsedGradeSheetMarkDto text = student.getMarks().getLast();
        assertThat(text.getScore()).isNull();
        assertThat(text.getText()).isEqualTo("не допущен");
        assertThat(text.getDate()).isEqualTo("2026-06-06");
        assertThat(text.getTeacher()).isEqualTo("Чеканин В.А.");
    }

    @Test
    void unparsableWorkbookBecomesInvalidFileExceptionWithServiceDetail() {
        expectParse(withStatus(HttpStatus.UNPROCESSABLE_ENTITY)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"error": "schedule_parse_error",
                         "detail": "в листе 'Лист1' не нашлась строка заголовка с колонкой 'Фамилия'"}
                        """));

        assertThatThrownBy(() -> client.parse(new byte[]{1}, "gradesheet.xlsx"))
                .isInstanceOf(InvalidFileException.class)
                .hasMessageContaining("не нашлась строка заголовка");
    }

    @Test
    void tooLargeWorkbookIsReportedAsGradeSheetProblem() {
        expectParse(withStatus(HttpStatus.PAYLOAD_TOO_LARGE)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"error": "file_too_large", "detail": "файл больше допустимых 5 МБ"}
                        """));

        assertThatThrownBy(() -> client.parse(new byte[]{1}, "gradesheet.xlsx"))
                .isInstanceOf(InvalidFileException.class)
                .hasMessage("Файл ведомости слишком велик для разбора.");
    }

    @Test
    void serviceErrorBecomesUnavailable() {
        expectParse(withStatus(HttpStatus.INTERNAL_SERVER_ERROR));

        assertThatThrownBy(() -> client.parse(new byte[]{1}, "gradesheet.xlsx"))
                .isInstanceOf(ScheduleServiceUnavailableException.class)
                .hasMessage("Сервис разбора ведомости недоступен.");
    }

    @Test
    void connectionFailureBecomesUnavailable() {
        expectParse(withException(new IOException("connection refused")));

        assertThatThrownBy(() -> client.parse(new byte[]{1}, "gradesheet.xlsx"))
                .isInstanceOf(ScheduleServiceUnavailableException.class)
                .hasMessage("Сервис разбора ведомости не отвечает.");
    }
}
