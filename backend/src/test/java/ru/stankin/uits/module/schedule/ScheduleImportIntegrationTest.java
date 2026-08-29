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
import ru.stankin.uits.module.schedule.dto.ParsedLessonDateDto;
import ru.stankin.uits.module.schedule.dto.ParsedLessonDto;
import ru.stankin.uits.module.schedule.dto.ParsedScheduleDto;
import ru.stankin.uits.module.schedule.dto.ScheduleResponseDto;
import ru.stankin.uits.module.schedule.entity.ScheduleLessonDate;
import ru.stankin.uits.module.schedule.repository.ScheduleRepository;
import ru.stankin.uits.module.staff.entity.Teacher;
import ru.stankin.uits.module.staff.repository.TeacherRepository;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;

class ScheduleImportIntegrationTest extends AbstractIntegrationTest {

    @MockitoBean
    private ScheduleServiceClient scheduleServiceClient;

    @Autowired
    private TeacherRepository teacherRepository;

    @Autowired
    private ScheduleRepository scheduleRepository;

    @Autowired
    private JdbcTemplate jdbc;

    private Teacher teacher;
    private String adminToken;

    @BeforeEach
    void setUp() {
        teacher = teacherRepository.save(Teacher.builder()
                .lastName("Чеканин")
                .firstName("Владимир")
                .build());
        createUser("schedule-admin", TestRole.ADMIN);
        adminToken = login("schedule-admin");
    }

    private static ParsedScheduleDto parsedWith(ParsedLessonDto... lessons) {
        return ParsedScheduleDto.builder().lessons(List.of(lessons)).build();
    }

    private static ParsedLessonDto lesson(int weekDay, int classTime, String group, ParsedLessonDateDto... dates) {
        return ParsedLessonDto.builder()
                .weekDay(weekDay)
                .classTime(classTime)
                .group(group)
                .name("Технические средства информационных систем")
                .type("Лабораторная")
                .subgroup("Б")
                .cabinet("216")
                .dates(List.of(dates))
                .build();
    }

    private static ParsedLessonDateDto period(String start, String end, boolean everyOtherWeek) {
        return ParsedLessonDateDto.builder().start(start).end(end).everyOtherWeek(everyOtherWeek).build();
    }

    private HttpEntity<MultiValueMap<String, Object>> pdfRequest(byte[] content) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        headers.setBearerAuth(adminToken);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", new ByteArrayResource(content) {
            @Override
            public String getFilename() {
                return "chekanin.pdf";
            }
        });

        return new HttpEntity<>(body, headers);
    }

    private <T> ResponseEntity<T> importPdf(Long teacherId, Class<T> responseType) {
        return restTemplate.exchange("/api/teachers/" + teacherId + "/schedule/import",
                HttpMethod.POST, pdfRequest("%PDF-1.4".getBytes(StandardCharsets.UTF_8)), responseType);
    }

    private int countRows(String table) {
        return jdbc.queryForObject("select count(*) from " + table, Integer.class);
    }

    private Set<ScheduleLessonDate> datesOfSingleLesson() {
        return scheduleRepository.findByTeacherId(teacher.getId()).orElseThrow()
                .getLessons().iterator().next().getDates();
    }

    private String groupOfSingleLesson() {
        return scheduleRepository.findByTeacherId(teacher.getId()).orElseThrow()
                .getLessons().iterator().next().getGroup();
    }

    @Test
    void importsParsedScheduleIntoDatabase() {
        given(scheduleServiceClient.parse(any(), any())).willReturn(parsedWith(
                lesson(1, 1, "ИДБ-25-11", period("16.03", "27.04", true)),
                lesson(6, 4, "ИДБ-25-12", period("14.02", "14.02", false))));

        ResponseEntity<ScheduleResponseDto> response = importPdf(teacher.getId(), ScheduleResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        ScheduleResponseDto body = response.getBody();
        assertThat(body.getTeacherId()).isEqualTo(teacher.getId());
        assertThat(body.getImportedFileName()).isEqualTo("chekanin.pdf");
        assertThat(body.getLessons()).hasSize(2);
        assertThat(body.getLessons().getFirst().getWeekNumber()).isEqualTo(1);
        assertThat(body.getLessons().getFirst().getGroup()).isEqualTo("ИДБ-25-11");
        assertThat(body.getLessons().getFirst().getSubgroup()).isEqualTo("Б");
        assertThat(body.getLessons().getFirst().getDates()).hasSize(1);
        assertThat(body.getLessons().getFirst().getDates().getFirst().isAlternativelyPeriod()).isTrue();
    }

    @Test
    void singleDayIsStoredWithoutEndDate() {
        given(scheduleServiceClient.parse(any(), any())).willReturn(parsedWith(
                lesson(1, 1, "ИДБ-25-11", period("14.02", "14.02", false))));

        importPdf(teacher.getId(), ScheduleResponseDto.class);

        ScheduleLessonDate date = datesOfSingleLesson().iterator().next();
        assertThat(date.getStartDate()).isEqualTo("14.02");
        assertThat(date.getEndDate()).isNull();
    }

    @Test
    void reimportReplacesPreviousSchedule() {
        given(scheduleServiceClient.parse(any(), any())).willReturn(parsedWith(
                lesson(1, 1, "ИДБ-25-11", period("16.03", "27.04", true)),
                lesson(2, 3, "ИДБ-25-12", period("17.03", "28.04", true))));
        importPdf(teacher.getId(), ScheduleResponseDto.class);

        given(scheduleServiceClient.parse(any(), any())).willReturn(parsedWith(
                lesson(5, 2, "ИДБ-24-11", period("01.09", "01.09", false))));
        importPdf(teacher.getId(), ScheduleResponseDto.class);

        assertThat(countRows("schedule_schedule")).isEqualTo(1);
        assertThat(countRows("schedule_schedulelesson")).isEqualTo(1);
        assertThat(countRows("schedule_schedulelessondate")).isEqualTo(1);
        assertThat(groupOfSingleLesson()).isEqualTo("ИДБ-24-11");
    }

    @Test
    void unknownTeacherIsRejectedBeforeParsing() {
        ResponseEntity<Map> response = importPdf(999_999L, Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        then(scheduleServiceClient).should(never()).parse(any(), any());
    }

    @Test
    void unparsableFileBecomesBadRequestWithServiceDetail() {
        given(scheduleServiceClient.parse(any(), any()))
                .willThrow(new InvalidFileException("в PDF не найдено ни одной таблицы расписания"));

        ResponseEntity<Map> response = importPdf(teacher.getId(), Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).containsEntry("detail", "в PDF не найдено ни одной таблицы расписания");
    }

    @Test
    void deadMicroserviceBecomesServiceUnavailable() {
        given(scheduleServiceClient.parse(any(), any()))
                .willThrow(new ScheduleServiceUnavailableException("Сервис разбора расписания не отвечает."));

        ResponseEntity<Map> response = importPdf(teacher.getId(), Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
    }

    @Test
    void failedImportLeavesPreviousScheduleIntact() {
        given(scheduleServiceClient.parse(any(), any())).willReturn(parsedWith(
                lesson(1, 1, "ИДБ-25-11", period("16.03", "27.04", true))));
        importPdf(teacher.getId(), ScheduleResponseDto.class);

        given(scheduleServiceClient.parse(any(), any()))
                .willThrow(new InvalidFileException("формат не распознан"));
        importPdf(teacher.getId(), Map.class);

        assertThat(countRows("schedule_schedulelesson")).isEqualTo(1);
        assertThat(groupOfSingleLesson()).isEqualTo("ИДБ-25-11");
    }

    @Test
    void emptyFileIsRejectedBeforeParsing() {
        ResponseEntity<Map> response = restTemplate.exchange(
                "/api/teachers/" + teacher.getId() + "/schedule/import",
                HttpMethod.POST, pdfRequest(new byte[0]), Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        then(scheduleServiceClient).should(never()).parse(any(), any());
    }
}
