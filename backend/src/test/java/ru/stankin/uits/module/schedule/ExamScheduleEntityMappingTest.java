package ru.stankin.uits.module.schedule;

import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import ru.stankin.uits.AbstractIntegrationTest;
import ru.stankin.uits.module.schedule.entity.Consultation;
import ru.stankin.uits.module.schedule.entity.Exam;
import ru.stankin.uits.module.schedule.entity.ExamSchedule;
import ru.stankin.uits.module.staff.entity.Teacher;
import ru.stankin.uits.module.staff.repository.TeacherRepository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Transactional
class ExamScheduleEntityMappingTest extends AbstractIntegrationTest {

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private TeacherRepository teacherRepository;

    @Autowired
    private JdbcTemplate jdbc;

    private Teacher teacher;

    @BeforeEach
    void createTeacher() {
        teacher = teacherRepository.save(Teacher.builder()
                .lastName("Ибатулин")
                .firstName("Марат")
                .position("доцент")
                .build());
    }

    private ExamSchedule persistScheduleWithExams() {
        ExamSchedule schedule = ExamSchedule.builder()
                .teacher(teacher)
                .importedFileName("exams-ibatulin-myu.pdf")
                .build();

        schedule.addExam(Exam.builder()
                .examDate(LocalDate.of(2025, 5, 15))
                .timeStart(LocalTime.of(16, 0))
                .timeEnd(LocalTime.of(21, 10))
                .group("ИДБ-21-11")
                .name("Применение методов машинного обучения в информационно обоснованных решениях")
                .cabinet("308")
                .consultation(Consultation.builder()
                        .date(LocalDate.of(2025, 5, 14))
                        .time(LocalTime.of(16, 0))
                        .cabinet("308")
                        .build())
                .build());

        schedule.addExam(Exam.builder()
                .examDate(LocalDate.of(2025, 5, 14))
                .timeStart(LocalTime.of(8, 30))
                .timeEnd(LocalTime.of(14, 0))
                .group("ИДБ-21-09")
                .name("Системы интеллектуального анализа данных")
                .cabinet("0402")
                .build());

        entityManager.persist(schedule);
        entityManager.flush();
        entityManager.clear();
        return schedule;
    }

    @Test
    void savesAndReadsBackWholeTree() {
        Long id = persistScheduleWithExams().getId();

        ExamSchedule found = entityManager.find(ExamSchedule.class, id);

        assertThat(found.getImportedFileName()).isEqualTo("exams-ibatulin-myu.pdf");
        assertThat(found.getTeacher().getLastName()).isEqualTo("Ибатулин");
        assertThat(found.getExams()).hasSize(2);
    }

    @Test
    void examsComeBackOrderedByDate() {
        Long id = persistScheduleWithExams().getId();

        ExamSchedule found = entityManager.find(ExamSchedule.class, id);

        assertThat(found.getExams())
                .extracting(Exam::getExamDate)
                .containsExactly(LocalDate.of(2025, 5, 14), LocalDate.of(2025, 5, 15));
    }

    @Test
    void consultationIsReadBackAsNestedValue() {
        persistScheduleWithExams();

        Exam exam = exam("ИДБ-21-11");

        assertThat(exam.getTimeStart()).isEqualTo(LocalTime.of(16, 0));
        assertThat(exam.getTimeEnd()).isEqualTo(LocalTime.of(21, 10));
        assertThat(exam.getConsultation().getDate()).isEqualTo(LocalDate.of(2025, 5, 14));
        assertThat(exam.getConsultation().getTime()).isEqualTo(LocalTime.of(16, 0));
        assertThat(exam.getConsultation().getCabinet()).isEqualTo("308");
    }

    @Test
    void examWithoutConsultationReadsBackAsNull() {
        persistScheduleWithExams();

        assertThat(exam("ИДБ-21-09").getConsultation()).isNull();
    }

    @Test
    void longDisciplineNameSurvivesTheColumn() {
        persistScheduleWithExams();

        assertThat(exam("ИДБ-21-11").getName())
                .isEqualTo("Применение методов машинного обучения в информационно обоснованных решениях");
    }

    @Test
    void removingExamFromScheduleDeletesItsRow() {
        Long id = persistScheduleWithExams().getId();

        ExamSchedule found = entityManager.find(ExamSchedule.class, id);
        found.getExams().clear();
        entityManager.flush();

        assertThat(count("schedule_exam")).isZero();
        assertThat(count("schedule_examschedule")).isEqualTo(1);
    }

    @Test
    void deletingScheduleDeletesExams() {
        Long id = persistScheduleWithExams().getId();

        entityManager.remove(entityManager.find(ExamSchedule.class, id));
        entityManager.flush();

        assertThat(count("schedule_examschedule")).isZero();
        assertThat(count("schedule_exam")).isZero();
    }

    @Test
    void deletingTeacherDeletesExamScheduleByDatabaseCascade() {
        persistScheduleWithExams();

        jdbc.update("delete from employee_teacher where id = ?", teacher.getId());

        assertThat(count("schedule_examschedule")).isZero();
        assertThat(count("schedule_exam")).isZero();
    }

    @Test
    void halfFilledConsultationIsRejectedByCheckConstraint() {
        ExamSchedule schedule = ExamSchedule.builder().teacher(teacher).build();
        entityManager.persist(schedule);
        entityManager.flush();

        assertThatThrownBy(() -> jdbc.update("""
                insert into schedule_exam
                    (exam_date, time_start, time_end, "group", name, cabinet,
                     consultation_date, exam_schedule_id)
                values (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                LocalDate.of(2025, 5, 19), LocalTime.of(8, 30), LocalTime.of(14, 0),
                "ИДБ-21-10", "Системы интеллектуального анализа данных", "308",
                LocalDate.of(2025, 5, 17), schedule.getId()))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("ck_exam_consultation_all_or_none");
    }

    private Exam exam(String group) {
        List<Exam> found = entityManager
                .createQuery("select e from Exam e where e.group = :group", Exam.class)
                .setParameter("group", group)
                .getResultList();
        assertThat(found).hasSize(1);
        return found.getFirst();
    }

    private int count(String table) {
        return jdbc.queryForObject("select count(*) from " + table, Integer.class);
    }
}
