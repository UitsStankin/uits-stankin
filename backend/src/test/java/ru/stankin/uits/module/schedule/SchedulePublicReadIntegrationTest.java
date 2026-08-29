package ru.stankin.uits.module.schedule;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import ru.stankin.uits.AbstractIntegrationTest;
import ru.stankin.uits.module.schedule.dto.ScheduleLessonResponseDto;
import ru.stankin.uits.module.schedule.dto.ScheduleResponseDto;
import ru.stankin.uits.module.schedule.entity.Schedule;
import ru.stankin.uits.module.schedule.entity.ScheduleLesson;
import ru.stankin.uits.module.schedule.entity.ScheduleLessonDate;
import ru.stankin.uits.module.schedule.repository.ScheduleRepository;
import ru.stankin.uits.module.staff.entity.Teacher;
import ru.stankin.uits.module.staff.repository.TeacherRepository;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

class SchedulePublicReadIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private TeacherRepository teacherRepository;

    @Autowired
    private ScheduleRepository scheduleRepository;

    @Autowired
    private JdbcTemplate jdbc;

    private Teacher teacher;

    @BeforeEach
    void setUp() {
        teacher = teacherRepository.save(Teacher.builder()
                .lastName("Чеканин")
                .firstName("Владимир")
                .build());
    }

    private static ScheduleLesson lesson(int weekNumber, int classTime, String group) {
        ScheduleLesson lesson = ScheduleLesson.builder()
                .weekNumber(weekNumber)
                .classTime(classTime)
                .group(group)
                .name("Технические средства информационных систем")
                .type("Лабораторная")
                .subgroup("Б")
                .cabinet("216")
                .build();
        lesson.addDate(ScheduleLessonDate.builder()
                .startDate("16.03")
                .endDate("27.04")
                .alternativelyPeriod(true)
                .build());

        return lesson;
    }

    private void saveSchedule(ScheduleLesson... lessons) {
        Schedule schedule = Schedule.builder()
                .teacher(teacher)
                .importedFileName("chekanin.pdf")
                .build();

        for (ScheduleLesson lesson : lessons) {
            schedule.addLesson(lesson);
        }

        scheduleRepository.save(schedule);
    }

    private <T> ResponseEntity<T> getSchedule(Long teacherId, Class<T> responseType) {
        return restTemplate.getForEntity("/api/public/teachers/" + teacherId + "/schedule", responseType);
    }

    @Test
    void anonymousReadsImportedSchedule() {
        saveSchedule(lesson(1, 1, "ИДБ-25-11"));

        ResponseEntity<ScheduleResponseDto> response = getSchedule(teacher.getId(), ScheduleResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        ScheduleResponseDto body = response.getBody();
        assertThat(body.getTeacherId()).isEqualTo(teacher.getId());
        assertThat(body.getTeacherName()).isEqualTo("Чеканин Владимир");
        assertThat(body.getImportedFileName()).isEqualTo("chekanin.pdf");
        assertThat(body.getLessons()).hasSize(1);

        ScheduleLessonResponseDto first = body.getLessons().getFirst();
        assertThat(first.getWeekNumber()).isEqualTo(1);
        assertThat(first.getClassTime()).isEqualTo(1);
        assertThat(first.getGroup()).isEqualTo("ИДБ-25-11");
        assertThat(first.getSubgroup()).isEqualTo("Б");
        assertThat(first.getCabinet()).isEqualTo("216");
        assertThat(first.getDates()).hasSize(1);
        assertThat(first.getDates().getFirst().getStartDate()).isEqualTo("16.03");
        assertThat(first.getDates().getFirst().getEndDate()).isEqualTo("27.04");
        assertThat(first.getDates().getFirst().isAlternativelyPeriod()).isTrue();
    }

    @Test
    void lessonsAreOrderedByWeekDayThenClassTime() {
        saveSchedule(
                lesson(6, 4, "ИДБ-24-11"),
                lesson(1, 5, "ИДБ-25-12"),
                lesson(1, 2, "ИДБ-25-11"));

        ScheduleResponseDto body = getSchedule(teacher.getId(), ScheduleResponseDto.class).getBody();

        assertThat(body.getLessons())
                .extracting(ScheduleLessonResponseDto::getWeekNumber, ScheduleLessonResponseDto::getClassTime)
                .containsExactly(tuple(1, 2), tuple(1, 5), tuple(6, 4));
    }

    @Test
    void teacherWithoutScheduleGetsEmptyLessons() {
        ResponseEntity<ScheduleResponseDto> response = getSchedule(teacher.getId(), ScheduleResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        ScheduleResponseDto body = response.getBody();
        assertThat(body.getTeacherId()).isEqualTo(teacher.getId());
        assertThat(body.getImportedFileName()).isNull();
        assertThat(body.getLessons()).isEmpty();
    }

    @Test
    void readingScheduleNeverWritesToDatabase() {
        getSchedule(teacher.getId(), ScheduleResponseDto.class);

        assertThat(jdbc.queryForObject("select count(*) from schedule_schedule", Integer.class)).isZero();
    }

    @Test
    void unknownTeacherIsNotFound() {
        ResponseEntity<Map> response = getSchedule(999_999L, Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }
}
