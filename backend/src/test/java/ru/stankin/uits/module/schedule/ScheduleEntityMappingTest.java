package ru.stankin.uits.module.schedule;

import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import ru.stankin.uits.AbstractIntegrationTest;
import ru.stankin.uits.module.schedule.entity.Schedule;
import ru.stankin.uits.module.schedule.entity.ScheduleLesson;
import ru.stankin.uits.module.schedule.entity.ScheduleLessonDate;
import ru.stankin.uits.module.staff.entity.Teacher;
import ru.stankin.uits.module.staff.repository.TeacherRepository;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@Transactional
class ScheduleEntityMappingTest extends AbstractIntegrationTest {

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
                .lastName("Чеканин")
                .firstName("Владимир")
                .position("доцент")
                .build());
    }

    private Schedule persistScheduleWithLesson() {
        Schedule schedule = Schedule.builder()
                .teacher(teacher)
                .importedFileName("chekanin.pdf")
                .build();

        ScheduleLesson lesson = ScheduleLesson.builder()
                .weekNumber(1)
                .classTime(1)
                .group("ИДБ-25-11")
                .name("Технические средства информационных систем")
                .type("Лабораторная")
                .cabinet("216")
                .subgroup("Б")
                .build();
        schedule.addLesson(lesson);

        lesson.addDate(ScheduleLessonDate.builder()
                .startDate("16.03")
                .endDate("27.04")
                .alternativelyPeriod(true)
                .build());
        lesson.addDate(ScheduleLessonDate.builder()
                .startDate("18.04")
                .alternativelyPeriod(false)
                .build());

        entityManager.persist(schedule);
        entityManager.flush();
        entityManager.clear();
        return schedule;
    }

    @Test
    void savesAndReadsBackWholeTree() {
        Long id = persistScheduleWithLesson().getId();

        Schedule found = entityManager.find(Schedule.class, id);

        assertThat(found.getImportedFileName()).isEqualTo("chekanin.pdf");
        assertThat(found.getTeacher().getLastName()).isEqualTo("Чеканин");
        assertThat(found.getLessons()).hasSize(1);

        ScheduleLesson lesson = found.getLessons().getFirst();
        assertThat(lesson.getGroup()).isEqualTo("ИДБ-25-11");
        assertThat(lesson.getWeekNumber()).isEqualTo(1);
        assertThat(lesson.getClassTime()).isEqualTo(1);
        assertThat(lesson.getSubgroup()).isEqualTo("Б");
        assertThat(lesson.getDates()).hasSize(2);
    }

    @Test
    void queriesByQuotedGroupColumn() {
        persistScheduleWithLesson();

        List<ScheduleLesson> found = entityManager
                .createQuery("select l from ScheduleLesson l where l.group = :group", ScheduleLesson.class)
                .setParameter("group", "ИДБ-25-11")
                .getResultList();

        assertThat(found).hasSize(1);
    }

    @Test
    void removingLessonFromScheduleDeletesItsDates() {
        Long id = persistScheduleWithLesson().getId();

        Schedule found = entityManager.find(Schedule.class, id);
        found.getLessons().clear();
        entityManager.flush();

        assertThat(count("schedule_schedulelesson")).isZero();
        assertThat(count("schedule_schedulelessondate")).isZero();
        assertThat(count("schedule_schedule")).isEqualTo(1);
    }

    @Test
    void deletingScheduleDeletesLessonsAndDates() {
        Long id = persistScheduleWithLesson().getId();

        entityManager.remove(entityManager.find(Schedule.class, id));
        entityManager.flush();

        assertThat(count("schedule_schedule")).isZero();
        assertThat(count("schedule_schedulelesson")).isZero();
        assertThat(count("schedule_schedulelessondate")).isZero();
    }

    private int count(String table) {
        return jdbc.queryForObject("select count(*) from " + table, Integer.class);
    }
}
