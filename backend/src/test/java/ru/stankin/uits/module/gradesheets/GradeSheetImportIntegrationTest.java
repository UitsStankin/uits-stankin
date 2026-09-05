package ru.stankin.uits.module.gradesheets;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import ru.stankin.uits.AbstractIntegrationTest;
import ru.stankin.uits.TestRole;
import ru.stankin.uits.common.exception.ScheduleServiceUnavailableException;
import ru.stankin.uits.module.gradesheets.client.GradeSheetParseClient;
import ru.stankin.uits.module.gradesheets.dto.GradeSheetImportResponseDto;
import ru.stankin.uits.module.gradesheets.dto.ImportedGradeSheetDto;
import ru.stankin.uits.module.gradesheets.dto.ParsedGradeSheetDto;
import ru.stankin.uits.module.gradesheets.dto.ParsedGradeSheetMarkDto;
import ru.stankin.uits.module.gradesheets.dto.ParsedGradeSheetStudentDto;
import ru.stankin.uits.module.gradesheets.dto.ParsedGradeSheetsDto;
import ru.stankin.uits.module.gradesheets.entity.GradeSheet;
import ru.stankin.uits.module.gradesheets.entity.GradeSheetStudent;
import ru.stankin.uits.module.gradesheets.repository.GradeSheetRepository;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

class GradeSheetImportIntegrationTest extends AbstractIntegrationTest {

    private static final String DISCIPLINE = "Технические средства информационных систем";
    private static final String SEMESTER = "Весенний семестр 2025/2026 учебного года";
    private static final String WARNING =
            "группа в шапке 'ИДБ-25-14' не совпадает с именем листа 'ИДБ-25-15'";

    @MockitoBean
    private GradeSheetParseClient gradeSheetParseClient;

    @Autowired
    private GradeSheetRepository gradeSheetRepository;

    @Autowired
    private JdbcTemplate jdbc;

    private String adminToken;

    @BeforeEach
    void setUp() {
        createUser("gradesheet-admin", TestRole.ADMIN);
        adminToken = login("gradesheet-admin");
    }

    private static ParsedGradeSheetMarkDto score(String block, String value) {
        return ParsedGradeSheetMarkDto.builder().block(block).score(new BigDecimal(value)).build();
    }

    private static ParsedGradeSheetStudentDto student(
            int number, String lastName, ParsedGradeSheetMarkDto... marks) {
        return ParsedGradeSheetStudentDto.builder()
                .number(number)
                .lastName(lastName)
                .firstName("Александр")
                .patronymic("Абдул-Керимович")
                .marks(List.of(marks))
                .build();
    }

    private static ParsedGradeSheetDto sheet(String group, ParsedGradeSheetStudentDto... students) {
        return ParsedGradeSheetDto.builder()
                .sheetName(group)
                .group(group)
                .discipline(DISCIPLINE)
                .department("УИТС")
                .teachers(List.of("Чеканин В.А.", "Ступивцев А.В."))
                .semester(SEMESTER)
                .direction("09.03.03 «Прикладная информатика»")
                .blocks(List.of("М1", "Зачёт"))
                .students(List.of(students))
                .warnings(List.of(WARNING))
                .build();
    }

    private static ParsedGradeSheetsDto parsedWith(ParsedGradeSheetDto... sheets) {
        return ParsedGradeSheetsDto.builder().sheets(List.of(sheets)).build();
    }

    private HttpEntity<MultiValueMap<String, Object>> workbookRequest(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        if (token != null) {
            headers.setBearerAuth(token);
        }

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", new ByteArrayResource("PK".getBytes(StandardCharsets.UTF_8)) {
            @Override
            public String getFilename() {
                return "gradesheet-idb-25-tsis.xlsx";
            }
        });

        return new HttpEntity<>(body, headers);
    }

    private <T> ResponseEntity<T> importWorkbook(String token, Class<T> responseType) {
        return restTemplate.exchange("/api/gradesheets/import",
                HttpMethod.POST, workbookRequest(token), responseType);
    }

    private int countRows(String table) {
        return jdbc.queryForObject("select count(*) from " + table, Integer.class);
    }

    @Test
    void importsEverySheetOfTheWorkbook() {
        given(gradeSheetParseClient.parse(any(), any())).willReturn(parsedWith(
                sheet("ИДБ-25-11", student(1, "Абрамов", score("М1", "30")), student(2, "Авдеев")),
                sheet("ИДБ-25-12", student(1, "Агапова", score("М1", "25")))));

        ResponseEntity<GradeSheetImportResponseDto> response =
                importWorkbook(adminToken, GradeSheetImportResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getSheets()).hasSize(2);
        assertThat(countRows("gradesheet_gradesheet")).isEqualTo(2);
        assertThat(countRows("gradesheet_student")).isEqualTo(3);
        assertThat(countRows("gradesheet_mark")).isEqualTo(2);
    }

    @Test
    void responseCarriesIdsCountsAndWarnings() {
        given(gradeSheetParseClient.parse(any(), any())).willReturn(parsedWith(
                sheet("ИДБ-25-11", student(1, "Абрамов", score("М1", "30")))));

        ImportedGradeSheetDto imported =
                importWorkbook(adminToken, GradeSheetImportResponseDto.class)
                        .getBody().getSheets().getFirst();

        assertThat(imported.getId()).isNotNull();
        assertThat(imported.getSheetName()).isEqualTo("ИДБ-25-11");
        assertThat(imported.getDiscipline()).isEqualTo(DISCIPLINE);
        assertThat(imported.getGroup()).isEqualTo("ИДБ-25-11");
        assertThat(imported.getSemester()).isEqualTo(SEMESTER);
        assertThat(imported.getStudentCount()).isEqualTo(1);
        assertThat(imported.getWarnings()).containsExactly(WARNING);
    }

    @Test
    void headerFieldsAreStored() {
        given(gradeSheetParseClient.parse(any(), any())).willReturn(parsedWith(
                sheet("ИДБ-25-11", student(1, "Абрамов", score("М1", "30")))));

        importWorkbook(adminToken, GradeSheetImportResponseDto.class);

        GradeSheet stored = gradeSheetRepository.findAll().getFirst();
        assertThat(stored.getDepartment()).isEqualTo("УИТС");
        assertThat(stored.getDirection()).isEqualTo("09.03.03 «Прикладная информатика»");
        assertThat(stored.getImportedTeachers()).isEqualTo("Чеканин В.А., Ступивцев А.В.");
        assertThat(stored.getImportedFileName()).isEqualTo("gradesheet-idb-25-tsis.xlsx");
        assertThat(stored.getImportedAt()).isNotNull();
        assertThat(stored.getTeacher()).isNull();
        assertThat(stored.getSubject()).isNull();
    }

    @Test
    void textInsteadOfScoreIsStored() {
        given(gradeSheetParseClient.parse(any(), any())).willReturn(parsedWith(
                sheet("ИДБ-25-11", ParsedGradeSheetStudentDto.builder()
                        .number(24)
                        .lastName("Галкин")
                        .marks(List.of(ParsedGradeSheetMarkDto.builder()
                                .block("Зачёт")
                                .text("не допущен")
                                .date("2026-06-06")
                                .teacher("Чеканин В.А.")
                                .build()))
                        .build())));

        importWorkbook(adminToken, GradeSheetImportResponseDto.class);

        assertThat(jdbc.queryForObject(
                "select mark_text from gradesheet_mark", String.class)).isEqualTo("не допущен");
        assertThat(jdbc.queryForObject(
                "select score from gradesheet_mark", BigDecimal.class)).isNull();
    }

    @Test
    void studentWithoutMarksIsStoredAnyway() {
        given(gradeSheetParseClient.parse(any(), any())).willReturn(parsedWith(
                sheet("ИДБ-25-11", student(29, "Аверин"))));

        importWorkbook(adminToken, GradeSheetImportResponseDto.class);

        assertThat(countRows("gradesheet_student")).isEqualTo(1);
        assertThat(countRows("gradesheet_mark")).isZero();
    }

    @Test
    void emptyMarkIsSkippedInsteadOfBreakingTheCheckConstraint() {
        given(gradeSheetParseClient.parse(any(), any())).willReturn(parsedWith(
                sheet("ИДБ-25-11", ParsedGradeSheetStudentDto.builder()
                        .number(1)
                        .lastName("Абрамов")
                        .marks(List.of(ParsedGradeSheetMarkDto.builder().block("М1").build()))
                        .build())));

        ResponseEntity<GradeSheetImportResponseDto> response =
                importWorkbook(adminToken, GradeSheetImportResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(countRows("gradesheet_mark")).isZero();
    }

    @Test
    void repeatedImportReplacesStudentsInsteadOfAddingASecondSheet() {
        given(gradeSheetParseClient.parse(any(), any())).willReturn(parsedWith(
                sheet("ИДБ-25-11", student(1, "Абрамов", score("М1", "30")), student(2, "Авдеев"))));
        importWorkbook(adminToken, GradeSheetImportResponseDto.class);

        given(gradeSheetParseClient.parse(any(), any())).willReturn(parsedWith(
                sheet("ИДБ-25-11", student(1, "Агапова", score("М1", "45")))));
        importWorkbook(adminToken, GradeSheetImportResponseDto.class);

        assertThat(countRows("gradesheet_gradesheet")).isEqualTo(1);
        assertThat(countRows("gradesheet_student")).isEqualTo(1);

        Long id = gradeSheetRepository.findAll().getFirst().getId();
        assertThat(gradeSheetRepository.findWithStudentsById(id).orElseThrow().getStudents())
                .extracting(GradeSheetStudent::getLastName)
                .containsExactly("Агапова");
    }

    @Test
    void sheetWithoutSemesterIsRejected() {
        given(gradeSheetParseClient.parse(any(), any())).willReturn(parsedWith(
                ParsedGradeSheetDto.builder()
                        .sheetName("ИДБ-25-11")
                        .group("ИДБ-25-11")
                        .discipline(DISCIPLINE)
                        .students(List.of(student(1, "Абрамов")))
                        .build()));

        ResponseEntity<String> response = importWorkbook(adminToken, String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).contains("семестр");
        assertThat(countRows("gradesheet_gradesheet")).isZero();
    }

    @Test
    void valueLongerThanTheColumnIsRejectedWithAReadableMessage() {
        given(gradeSheetParseClient.parse(any(), any())).willReturn(parsedWith(
                sheet("ИДБ-25-11", student(1, "А".repeat(51)))));

        ResponseEntity<String> response = importWorkbook(adminToken, String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).contains("фамилия");
        assertThat(countRows("gradesheet_gradesheet")).isZero();
    }

    @Test
    void unavailableParserIsReportedAsServiceUnavailable() {
        given(gradeSheetParseClient.parse(any(), any()))
                .willThrow(new ScheduleServiceUnavailableException("Сервис разбора ведомости не отвечает."));

        ResponseEntity<String> response = importWorkbook(adminToken, String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
    }

    @Test
    void anonymousCannotImport() {
        ResponseEntity<String> response = importWorkbook(null, String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void teacherCannotImport() {
        createUser("gradesheet-teacher", TestRole.TEACHER);

        ResponseEntity<String> response =
                importWorkbook(login("gradesheet-teacher"), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }
}
