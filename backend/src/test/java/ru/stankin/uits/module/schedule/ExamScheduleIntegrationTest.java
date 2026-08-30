package ru.stankin.uits.module.schedule;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import ru.stankin.uits.AbstractIntegrationTest;
import ru.stankin.uits.module.schedule.dto.ExamScheduleResponseDto;
import ru.stankin.uits.module.staff.entity.Teacher;
import ru.stankin.uits.module.staff.repository.TeacherRepository;

import static org.assertj.core.api.Assertions.assertThat;

class ExamScheduleIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private TeacherRepository teacherRepository;

    private Teacher bothLinks;
    private Teacher graduationOnly;
    private Teacher blankLinks;
    private Teacher withoutLinks;

    @BeforeEach
    void setUp() {
        bothLinks = teacher("Чеканин", "Владимир", "Алексеевич",
                "https://stankin.ru/exams-graduation.pdf", "/media/exams/chekanin.pdf");
        graduationOnly = teacher("Абрамов", "Пётр", null,
                "https://stankin.ru/abramov.pdf", null);
        blankLinks = teacher("Разумовский", "Алексей", "Игоревич", "", "");
        withoutLinks = teacher("Яковлев", "Иван", null, null, null);
    }

    private Teacher teacher(String lastName, String firstName, String patronymic,
                            String graduation, String nonGraduation) {
        return teacherRepository.save(Teacher.builder()
                .lastName(lastName)
                .firstName(firstName)
                .patronymic(patronymic)
                .examScheduleGraduation(graduation)
                .examScheduleNonGraduation(nonGraduation)
                .build());
    }

    private ExamScheduleResponseDto[] exams() {
        return exams("");
    }

    private ExamScheduleResponseDto[] exams(String query) {
        ResponseEntity<ExamScheduleResponseDto[]> response =
                restTemplate.getForEntity("/api/public/schedule/exams" + query, ExamScheduleResponseDto[].class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);

        return response.getBody();
    }

    @Test
    void returnsOnlyTeachersWithAtLeastOneLink() {
        assertThat(exams())
                .extracting(ExamScheduleResponseDto::getTeacherId)
                .containsExactlyInAnyOrder(bothLinks.getId(), graduationOnly.getId())
                .doesNotContain(blankLinks.getId(), withoutLinks.getId());
    }

    @Test
    void graduationTypeSelectsOnlyTeachersWithThatLink() {
        assertThat(exams("?type=GRADUATION"))
                .extracting(ExamScheduleResponseDto::getTeacherId)
                .containsExactlyInAnyOrder(bothLinks.getId(), graduationOnly.getId());
    }

    @Test
    void nonGraduationTypeSelectsOnlyTeachersWithThatLink() {
        assertThat(exams("?type=NON_GRADUATION"))
                .extracting(ExamScheduleResponseDto::getTeacherId)
                .containsExactly(bothLinks.getId());
    }

    @Test
    void unknownTypeGives400() {
        ResponseEntity<ProblemDetail> response =
                restTemplate.getForEntity("/api/public/schedule/exams?type=DIPLOMA", ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void blankTypeIsTreatedAsNoFilter() {
        assertThat(exams("?type=")).hasSize(2);
    }

    @Test
    void teachersAreOrderedByLastName() {
        assertThat(exams())
                .extracting(ExamScheduleResponseDto::getTeacherName)
                .containsExactly("Абрамов Пётр", "Чеканин Владимир Алексеевич");
    }

    @Test
    void bothLinksAreReturnedAsStored() {
        ExamScheduleResponseDto card = exams()[1];

        assertThat(card.getTeacherId()).isEqualTo(bothLinks.getId());
        assertThat(card.getExamScheduleGraduation()).isEqualTo("https://stankin.ru/exams-graduation.pdf");
        assertThat(card.getExamScheduleNonGraduation()).isEqualTo("/media/exams/chekanin.pdf");
    }

    @Test
    void missingLinkComesAsNull() {
        ExamScheduleResponseDto card = exams()[0];

        assertThat(card.getTeacherId()).isEqualTo(graduationOnly.getId());
        assertThat(card.getExamScheduleNonGraduation()).isNull();
    }

    @Test
    void nobodyWithLinksGivesEmptyArray() {
        teacherRepository.deleteAll();

        assertThat(exams()).isEmpty();
    }
}
