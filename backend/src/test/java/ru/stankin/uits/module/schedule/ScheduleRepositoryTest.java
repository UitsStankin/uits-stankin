package ru.stankin.uits.module.schedule;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import ru.stankin.uits.AbstractIntegrationTest;
import ru.stankin.uits.module.schedule.entity.Schedule;
import ru.stankin.uits.module.schedule.entity.ScheduleLesson;
import ru.stankin.uits.module.schedule.entity.ScheduleLessonDate;
import ru.stankin.uits.module.schedule.repository.ScheduleRepository;
import ru.stankin.uits.module.staff.entity.Teacher;
import ru.stankin.uits.module.staff.repository.TeacherRepository;

import static org.assertj.core.api.Assertions.assertThat;

class ScheduleRepositoryTest extends AbstractIntegrationTest {

    @Autowired
    private ScheduleRepository scheduleRepository;

    @Autowired
    private TeacherRepository teacherRepository;

    private Teacher teacher;

    @BeforeEach
    void createTeacher() {
        teacher = teacherRepository.save(Teacher.builder()
                .lastName("Чеканин")
                .firstName("Владимир")
                .build());
    }

    private void saveScheduleWithTwoLessons() {
        Schedule schedule = Schedule.builder()
                .teacher(teacher)
                .importedFileName("chekanin.pdf")
                .build();

        ScheduleLesson monday = ScheduleLesson.builder()
                .weekNumber(1).classTime(1)
                .group("ИДБ-25-11")
                .name("Технические средства информационных систем")
                .type("Лабораторная")
                .build();
        monday.addDate(ScheduleLessonDate.builder()
                .startDate("16.03").endDate("27.04").alternativelyPeriod(true).build());
        monday.addDate(ScheduleLessonDate.builder()
                .startDate("18.04").build());
        schedule.addLesson(monday);

        ScheduleLesson saturday = ScheduleLesson.builder()
                .weekNumber(6).classTime(4)
                .group("ИДБ-25-11, ИДБ-25-12")
                .name("Технические средства информационных систем")
                .type("Лекция")
                .cabinet("0308")
                .build();
        saturday.addDate(ScheduleLessonDate.builder()
                .startDate("14.02").build());
        schedule.addLesson(saturday);

        scheduleRepository.save(schedule);
    }

    @Test
    void loadsLessonsAndDatesOutsideTransaction() {
        saveScheduleWithTwoLessons();

        Schedule found = scheduleRepository.findByTeacherId(teacher.getId()).orElseThrow();

        assertThat(found.getLessons()).hasSize(2);
        assertThat(found.getLessons())
                .flatExtracting(ScheduleLesson::getDates)
                .hasSize(3);
    }

    @Test
    void returnsEmptyWhenTeacherHasNoSchedule() {
        assertThat(scheduleRepository.findByTeacherId(teacher.getId())).isEmpty();
    }
}
