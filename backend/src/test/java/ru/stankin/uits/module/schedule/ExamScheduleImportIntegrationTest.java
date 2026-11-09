package ru.stankin.uits.module.schedule;

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
import ru.stankin.uits.common.exception.InvalidFileException;
import ru.stankin.uits.common.exception.ScheduleServiceUnavailableException;
import ru.stankin.uits.module.schedule.client.ScheduleServiceClient;
import ru.stankin.uits.module.schedule.dto.ParsedConsultationDto;
import ru.stankin.uits.module.schedule.dto.ParsedExamDto;
import ru.stankin.uits.module.schedule.dto.ParsedExamsDto;
import ru.stankin.uits.module.schedule.dto.ExamScheduleResponseDto;
import ru.stankin.uits.module.schedule.entity.Exam;
import ru.stankin.uits.module.schedule.repository.ExamScheduleRepository;
import ru.stankin.uits.module.staff.entity.Teacher;
import ru.stankin.uits.module.staff.repository.TeacherRepository;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;

class ExamScheduleImportIntegrationTest extends AbstractIntegrationTest {

    private static final String LONG_NAME =
            "Применение методов машинного обучения в информационно обоснованных решениях";

    @MockitoBean
    private ScheduleServiceClient scheduleServiceClient;

    @Autowired
    private TeacherRepository teacherRepository;

    @Autowired
    private ExamScheduleRepository examScheduleRepository;

    @Autowired
    private JdbcTemplate jdbc;

    private Teacher teacher;
    private String adminToken;

    @BeforeEach
    void setUp() {
        teacher = teacherRepository.save(Teacher.builder()
                .lastName("Ибатулин")
                .firstName("Марат")
                .build());
        createUser("exams-admin", TestRole.ADMIN);
        adminToken = login("exams-admin");
    }

    private static ParsedExamsDto parsedWith(ParsedExamDto... exams) {
        return ParsedExamsDto.builder().exams(List.of(exams)).build();
    }

    private static ParsedExamDto exam(String date, String group, ParsedConsultationDto consultation) {
        return ParsedExamDto.builder()
                .date(date)
                .weekDay(4)
                .timeStart("16:00")
                .timeEnd("21:10")
                .group(group)
                .name(LONG_NAME)
                .cabinet("308")
                .consultation(consultation)
                .build();
    }

    private static ParsedConsultationDto consultation(String date) {
        return ParsedConsultationDto.builder().date(date).time("16:00").cabinet("0402").build();
    }

    private HttpEntity<MultiValueMap<String, Object>> pdfRequest(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        if (token != null) {
            headers.setBearerAuth(token);
        }

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", new ByteArrayResource("%PDF-1.4".getBytes(StandardCharsets.UTF_8)) {
            @Override
            public String getFilename() {
                return "exams-ibatulin-myu.pdf";
            }
        });

        return new HttpEntity<>(body, headers);
    }

    private <T> ResponseEntity<T> importExams(Long teacherId, Class<T> responseType) {
        return restTemplate.exchange("/api/teachers/" + teacherId + "/exams/import",
                HttpMethod.POST, pdfRequest(adminToken), responseType);
    }

    private int countRows(String table) {
        return jdbc.queryForObject("select count(*) from " + table, Integer.class);
    }

    private Exam singleExam() {
        return examScheduleRepository.findByTeacherId(teacher.getId()).orElseThrow()
                .getExams().iterator().next();
    }

    @Test
    void importsParsedExamsIntoDatabase() {
        given(scheduleServiceClient.parseExams(any(), any())).willReturn(parsedWith(
                exam("2025-05-15", "ИДБ-21-11", consultation("2025-05-14")),
                exam("2025-05-21", "ИДБ-21-09", consultation("2025-05-20"))));

        ResponseEntity<ExamScheduleResponseDto> response =
                importExams(teacher.getId(), ExamScheduleResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        ExamScheduleResponseDto body = response.getBody();
        assertThat(body.getTeacherId()).isEqualTo(teacher.getId());
        assertThat(body.getTeacherName()).contains("Ибатулин");
        assertThat(body.getExams()).hasSize(2);
        assertThat(body.getExams().getFirst().getDate()).isEqualTo(LocalDate.of(2025, 5, 15));
        assertThat(body.getExams().getFirst().getTimeStart()).isEqualTo(LocalTime.of(16, 0));
        assertThat(body.getExams().getFirst().getTimeEnd()).isEqualTo(LocalTime.of(21, 10));
        assertThat(body.getExams().getFirst().getName()).isEqualTo(LONG_NAME);
        assertThat(body.getExams().getFirst().getConsultation().getDate())
                .isEqualTo(LocalDate.of(2025, 5, 14));
        assertThat(examScheduleRepository.findByTeacherId(teacher.getId()).orElseThrow()
                .getImportedFileName()).isEqualTo("exams-ibatulin-myu.pdf");
    }

    @Test
    void examWithoutConsultationIsStoredWithEmptyColumns() {
        given(scheduleServiceClient.parseExams(any(), any()))
                .willReturn(parsedWith(exam("2025-05-15", "ИДБ-21-11", null)));

        ResponseEntity<ExamScheduleResponseDto> response =
                importExams(teacher.getId(), ExamScheduleResponseDto.class);

        assertThat(response.getBody().getExams().getFirst().getConsultation()).isNull();
        assertThat(singleExam().getConsultation()).isNull();
    }

    @Test
    void reimportReplacesPreviousExams() {
        given(scheduleServiceClient.parseExams(any(), any())).willReturn(parsedWith(
                exam("2025-05-15", "ИДБ-21-11", consultation("2025-05-14")),
                exam("2025-05-21", "ИДБ-21-09", consultation("2025-05-20"))));
        importExams(teacher.getId(), ExamScheduleResponseDto.class);

        given(scheduleServiceClient.parseExams(any(), any()))
                .willReturn(parsedWith(exam("2026-01-13", "ИДБ-22-10", null)));
        importExams(teacher.getId(), ExamScheduleResponseDto.class);

        assertThat(countRows("schedule_examschedule")).isEqualTo(1);
        assertThat(countRows("schedule_exam")).isEqualTo(1);
        assertThat(singleExam().getGroup()).isEqualTo("ИДБ-22-10");
    }

    @Test
    void lessonScheduleIsNotTouchedByExamImport() {
        given(scheduleServiceClient.parseExams(any(), any()))
                .willReturn(parsedWith(exam("2025-05-15", "ИДБ-21-11", null)));

        importExams(teacher.getId(), ExamScheduleResponseDto.class);

        assertThat(countRows("schedule_schedule")).isZero();
        then(scheduleServiceClient).should(never()).parse(any(), any());
    }

    @Test
    void unknownTeacherIsRejectedBeforeParsing() {
        ResponseEntity<Map> response = importExams(999_999L, Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        then(scheduleServiceClient).should(never()).parseExams(any(), any());
    }

    @Test
    void unparsableFileBecomesBadRequestWithServiceDetail() {
        given(scheduleServiceClient.parseExams(any(), any()))
                .willThrow(new InvalidFileException("в PDF не найдено ни одной таблицы экзаменов"));

        ResponseEntity<Map> response = importExams(teacher.getId(), Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody())
                .containsEntry("detail", "в PDF не найдено ни одной таблицы экзаменов");
    }

    @Test
    void deadMicroserviceBecomesServiceUnavailable() {
        given(scheduleServiceClient.parseExams(any(), any()))
                .willThrow(new ScheduleServiceUnavailableException("Сервис разбора расписания не отвечает."));

        ResponseEntity<Map> response = importExams(teacher.getId(), Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
    }

    @Test
    void emptyExamListIsRejectedAsBadFile() {
        given(scheduleServiceClient.parseExams(any(), any()))
                .willReturn(ParsedExamsDto.builder().exams(List.of()).build());

        ResponseEntity<Map> response = importExams(teacher.getId(), Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).containsEntry("detail", "В файле не найдено ни одного экзамена.");
    }

    @Test
    void unparsableDateFromServiceBecomesServiceUnavailable() {
        ParsedExamDto broken = exam("15.05.2025", "ИДБ-21-11", null);
        given(scheduleServiceClient.parseExams(any(), any())).willReturn(parsedWith(broken));

        ResponseEntity<Map> response = importExams(teacher.getId(), Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
        assertThat(countRows("schedule_exam")).isZero();
    }

    @Test
    void halfFilledConsultationFromServiceBecomesServiceUnavailable() {
        ParsedExamDto broken = exam("2025-05-15", "ИДБ-21-11",
                ParsedConsultationDto.builder().date("2025-05-14").build());
        given(scheduleServiceClient.parseExams(any(), any())).willReturn(parsedWith(broken));

        ResponseEntity<Map> response = importExams(teacher.getId(), Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
        assertThat(countRows("schedule_exam")).isZero();
    }

    @Test
    void overlongDisciplineNameBecomesBadRequest() {
        ParsedExamDto broken = ParsedExamDto.builder()
                .date("2025-05-15")
                .timeStart("16:00")
                .timeEnd("21:10")
                .group("ИДБ-21-11")
                .name("Д".repeat(257))
                .cabinet("308")
                .build();
        given(scheduleServiceClient.parseExams(any(), any())).willReturn(parsedWith(broken));

        ResponseEntity<Map> response = importExams(teacher.getId(), Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(countRows("schedule_exam")).isZero();
    }

    @Test
    void failedImportLeavesPreviousExamsIntact() {
        given(scheduleServiceClient.parseExams(any(), any()))
                .willReturn(parsedWith(exam("2025-05-15", "ИДБ-21-11", consultation("2025-05-14"))));
        importExams(teacher.getId(), ExamScheduleResponseDto.class);

        given(scheduleServiceClient.parseExams(any(), any()))
                .willThrow(new InvalidFileException("в PDF не найдено ни одной таблицы экзаменов"));
        importExams(teacher.getId(), Map.class);

        assertThat(countRows("schedule_exam")).isEqualTo(1);
        assertThat(singleExam().getGroup()).isEqualTo("ИДБ-21-11");
    }

    @Test
    void anonymousCannotImport() {
        ResponseEntity<Map> response = restTemplate.exchange(
                "/api/teachers/" + teacher.getId() + "/exams/import",
                HttpMethod.POST, pdfRequest(null), Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        then(scheduleServiceClient).should(never()).parseExams(any(), any());
    }

    @Test
    void teacherRoleCannotImport() {
        createUser("exams-teacher", TestRole.TEACHER);

        ResponseEntity<Map> response = restTemplate.exchange(
                "/api/teachers/" + teacher.getId() + "/exams/import",
                HttpMethod.POST, pdfRequest(login("exams-teacher")), Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        then(scheduleServiceClient).should(never()).parseExams(any(), any());
    }
}
