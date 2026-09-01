package ru.stankin.uits.module.schedule;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import ru.stankin.uits.AbstractIntegrationTest;
import ru.stankin.uits.module.schedule.dto.ExamResponseDto;
import ru.stankin.uits.module.schedule.dto.ExamScheduleResponseDto;
import ru.stankin.uits.module.schedule.entity.Consultation;
import ru.stankin.uits.module.schedule.entity.Exam;
import ru.stankin.uits.module.schedule.entity.ExamSchedule;
import ru.stankin.uits.module.schedule.repository.ExamScheduleRepository;
import ru.stankin.uits.module.staff.entity.Teacher;
import ru.stankin.uits.module.staff.repository.TeacherRepository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class ExamSchedulePublicReadIntegrationTest extends AbstractIntegrationTest {

    private static final ParameterizedTypeReference<List<ExamScheduleResponseDto>> SUMMARY =
            new ParameterizedTypeReference<>() {
            };

    @Autowired
    private TeacherRepository teacherRepository;

    @Autowired
    private ExamScheduleRepository examScheduleRepository;

    private Teacher ibatulin;
    private Teacher bychkova;
    private Teacher without;

    @BeforeEach
    void setUp() {
        ibatulin = teacherRepository.save(Teacher.builder().lastName("Ибатулин").firstName("Марат").build());
        bychkova = teacherRepository.save(Teacher.builder().lastName("Бычкова").firstName("Наталья").build());
        without = teacherRepository.save(Teacher.builder().lastName("Чеканин").firstName("Владимир").build());

        ExamSchedule ibatulinExams = ExamSchedule.builder().teacher(ibatulin).build();
        ibatulinExams.addExam(exam("2025-05-21", "ИДБ-21-09", "Машинное обучение", true));
        ibatulinExams.addExam(exam("2025-05-14", "ИДБ-21-09, ИДБ-21-10", "Системы анализа данных", false));
        examScheduleRepository.save(ibatulinExams);

        ExamSchedule bychkovaExams = ExamSchedule.builder().teacher(bychkova).build();
        bychkovaExams.addExam(exam("2025-01-09", "ИДБ-22-11", "Базы данных", true));
        examScheduleRepository.save(bychkovaExams);
    }

    private static Exam exam(String date, String group, String name, boolean withConsultation) {
        return Exam.builder()
                .examDate(LocalDate.parse(date))
                .timeStart(LocalTime.of(8, 30))
                .timeEnd(LocalTime.of(14, 0))
                .group(group)
                .name(name)
                .cabinet("308")
                .consultation(withConsultation
                        ? Consultation.builder()
                        .date(LocalDate.parse(date).minusDays(1))
                        .time(LocalTime.of(14, 10))
                        .cabinet("0402")
                        .build()
                        : null)
                .build();
    }

    private List<ExamScheduleResponseDto> summary(String query) {
        ResponseEntity<List<ExamScheduleResponseDto>> response =
                restTemplate.exchange("/api/public/exams" + query, HttpMethod.GET, null, SUMMARY);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);

        return response.getBody();
    }

    @Test
    void readsExamsOfOneTeacherWithoutAuthorization() {
        ResponseEntity<ExamScheduleResponseDto> response = restTemplate.getForEntity(
                "/api/public/teachers/" + ibatulin.getId() + "/exams", ExamScheduleResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getTeacherId()).isEqualTo(ibatulin.getId());
        assertThat(response.getBody().getTeacherName()).contains("Ибатулин");
        assertThat(response.getBody().getExams()).hasSize(2);
    }

    @Test
    void examsOfOneTeacherComeOrderedByDate() {
        ResponseEntity<ExamScheduleResponseDto> response = restTemplate.getForEntity(
                "/api/public/teachers/" + ibatulin.getId() + "/exams", ExamScheduleResponseDto.class);

        assertThat(response.getBody().getExams())
                .extracting(ExamResponseDto::getDate)
                .containsExactly(LocalDate.of(2025, 5, 14), LocalDate.of(2025, 5, 21));
    }

    @Test
    void teacherWithoutExamsGetsEmptyList() {
        ResponseEntity<ExamScheduleResponseDto> response = restTemplate.getForEntity(
                "/api/public/teachers/" + without.getId() + "/exams", ExamScheduleResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getTeacherId()).isEqualTo(without.getId());
        assertThat(response.getBody().getExams()).isEmpty();
    }

    @Test
    void unknownTeacherIsNotFound() {
        ResponseEntity<Map> response = restTemplate.getForEntity(
                "/api/public/teachers/999999/exams", Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void summaryListsOnlyTeachersWithExamsSortedByName() {
        List<ExamScheduleResponseDto> found = summary("");

        assertThat(found).hasSize(2);
        assertThat(found).extracting(ExamScheduleResponseDto::getTeacherName)
                .allSatisfy(name -> assertThat(name).isNotBlank());
        assertThat(found.getFirst().getTeacherName()).contains("Бычкова");
        assertThat(found.getLast().getTeacherName()).contains("Ибатулин");
    }

    @Test
    void summaryFiltersByTeacherId() {
        List<ExamScheduleResponseDto> found = summary("?teacherId=" + ibatulin.getId());

        assertThat(found).hasSize(1);
        assertThat(found.getFirst().getTeacherId()).isEqualTo(ibatulin.getId());
    }

    @Test
    void summaryFiltersByGroup() {
        List<ExamScheduleResponseDto> found = summary("?group=ИДБ-22-11");

        assertThat(found).hasSize(1);
        assertThat(found.getFirst().getTeacherId()).isEqualTo(bychkova.getId());
        assertThat(found.getFirst().getExams()).hasSize(1);
        assertThat(found.getFirst().getExams().getFirst().getGroup()).isEqualTo("ИДБ-22-11");
    }

    @Test
    void groupFilterMatchesOneCodeInsideAList() {
        List<ExamScheduleResponseDto> found = summary("?group=ИДБ-21-10");

        assertThat(found).hasSize(1);
        assertThat(found.getFirst().getTeacherId()).isEqualTo(ibatulin.getId());
        assertThat(found.getFirst().getExams()).hasSize(1);
        assertThat(found.getFirst().getExams().getFirst().getGroup())
                .isEqualTo("ИДБ-21-09, ИДБ-21-10");
    }

    @Test
    void groupFilterDropsTeachersWithoutMatchingExams() {
        List<ExamScheduleResponseDto> found = summary("?group=ИДБ-21-09");

        assertThat(found).hasSize(1);
        assertThat(found.getFirst().getTeacherId()).isEqualTo(ibatulin.getId());
        assertThat(found.getFirst().getExams()).hasSize(2);
    }

    @Test
    void unknownGroupGivesEmptyList() {
        assertThat(summary("?group=ИДБ-99-99")).isEmpty();
    }

    @Test
    void blankGroupIsNotAFilter() {
        assertThat(summary("?group=")).hasSize(2);
    }

    @Test
    void groupFilterIsCaseInsensitive() {
        List<ExamScheduleResponseDto> found = summary("?group=идб-22-11");

        assertThat(found).hasSize(1);
        assertThat(found.getFirst().getTeacherId()).isEqualTo(bychkova.getId());
    }

    @Test
    void teacherAndGroupFiltersWorkTogether() {
        assertThat(summary("?teacherId=" + bychkova.getId() + "&group=ИДБ-21-09")).isEmpty();
    }

    @Test
    void consultationIsNullWhenItWasAbsent() {
        List<ExamScheduleResponseDto> found = summary("?teacherId=" + ibatulin.getId());

        List<ExamResponseDto> exams = found.getFirst().getExams();
        assertThat(exams.getFirst().getConsultation()).isNull();
        assertThat(exams.getLast().getConsultation()).isNotNull();
        assertThat(exams.getLast().getConsultation().getDate()).isEqualTo(LocalDate.of(2025, 5, 20));
    }
}
