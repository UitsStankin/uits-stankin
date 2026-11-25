package ru.stankin.uits.module.staff;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.test.web.client.ResponseCreator;
import org.springframework.web.client.RestClient;
import ru.stankin.uits.common.exception.InvalidFileException;
import ru.stankin.uits.common.exception.ScheduleServiceUnavailableException;
import ru.stankin.uits.module.staff.client.StaffImportParseClient;
import ru.stankin.uits.module.staff.dto.ParsedStaffFileDto;
import ru.stankin.uits.module.staff.dto.ParsedStaffRowDto;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class StaffImportParseClientTest {

    private static final byte[] CSV = "ФИО;Должность\nТестов Тест;доцент\n".getBytes(StandardCharsets.UTF_8);

    private static final String RESPONSE_BODY = """
            {
              "rows": [
                {
                  "row_number": 2,
                  "category": "ППС",
                  "last_name": "Тестов",
                  "first_name": "Тест",
                  "patronymic": "Тестович",
                  "position": "доцент",
                  "degree": "канд. техн. наук",
                  "rank": "доцент",
                  "email": "t.testov@stankin.ru",
                  "phone_number": "+7 (499) 972-95-84",
                  "messenger": "@testov",
                  "experience": 12,
                  "professional_experience": 8,
                  "education": "МГТУ СТАНКИН",
                  "qualification": "Повышение квалификации",
                  "bio": "О себе",
                  "parse_errors": []
                }
              ],
              "warnings": []
            }
            """;

    private MockRestServiceServer server;
    private StaffImportParseClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://schedule-service:8000");
        server = MockRestServiceServer.bindTo(builder).build();
        client = new StaffImportParseClient(builder.build(), JsonMapper.builder().build());
    }

    private void expectParseStaff(ResponseCreator response) {
        server.expect(requestTo("http://schedule-service:8000/parse-staff"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().contentTypeCompatibleWith(MediaType.MULTIPART_FORM_DATA))
                .andRespond(response);
    }

    @Test
    void mapsSnakeCaseResponseToDto() {
        expectParseStaff(withSuccess(RESPONSE_BODY, MediaType.APPLICATION_JSON));

        ParsedStaffFileDto parsed = client.parse(CSV, "staff.csv");

        assertThat(parsed.getRows()).hasSize(1);
        ParsedStaffRowDto row = parsed.getRows().getFirst();
        assertThat(row.getRowNumber()).isEqualTo(2);
        assertThat(row.getLastName()).isEqualTo("Тестов");
        assertThat(row.getFirstName()).isEqualTo("Тест");
        assertThat(row.getPatronymic()).isEqualTo("Тестович");
        assertThat(row.getPhoneNumber()).isEqualTo("+7 (499) 972-95-84");
        assertThat(row.getProfessionalExperience()).isEqualTo(8);
        assertThat(row.getParseErrors()).isEmpty();
        server.verify();
    }

    @Test
    void unprocessableEntityBecomesInvalidFileExceptionWithDetail() {
        expectParseStaff(withStatus(HttpStatus.UNPROCESSABLE_ENTITY)
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"error\": \"schedule_parse_error\", \"detail\": \"в таблице не найдены обязательные колонки\"}"));

        assertThatThrownBy(() -> client.parse(CSV, "bad.csv"))
                .isInstanceOf(InvalidFileException.class)
                .hasMessage("в таблице не найдены обязательные колонки");
    }

    @Test
    void tooLargeBecomesInvalidFileException() {
        expectParseStaff(withStatus(HttpStatus.CONTENT_TOO_LARGE)
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"error\": \"file_too_large\", \"detail\": \"файл больше 5 МБ\"}"));

        assertThatThrownBy(() -> client.parse(CSV, "huge.xlsx"))
                .isInstanceOf(InvalidFileException.class);
    }

    @Test
    void badRequestOrServerErrorBecomesUnavailable() {
        expectParseStaff(withStatus(HttpStatus.BAD_REQUEST)
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"error\": \"invalid_request\", \"detail\": \"bad\"}"));

        assertThatThrownBy(() -> client.parse(CSV, "staff.csv"))
                .isInstanceOf(ScheduleServiceUnavailableException.class);
    }

    @Test
    void connectionFailureBecomesUnavailable() {
        expectParseStaff(withException(new IOException("connection refused")));

        assertThatThrownBy(() -> client.parse(CSV, "staff.csv"))
                .isInstanceOf(ScheduleServiceUnavailableException.class)
                .hasMessageContaining("не отвечает");
    }
}
