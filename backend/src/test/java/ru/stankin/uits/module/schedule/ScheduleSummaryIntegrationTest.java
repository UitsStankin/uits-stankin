package ru.stankin.uits.module.schedule;

import jakarta.persistence.EntityManagerFactory;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import ru.stankin.uits.AbstractIntegrationTest;
import ru.stankin.uits.module.schedule.dto.ScheduleResponseDto;
import ru.stankin.uits.module.schedule.entity.Schedule;
import ru.stankin.uits.module.schedule.entity.ScheduleLesson;
import ru.stankin.uits.module.schedule.entity.ScheduleLessonDate;
import ru.stankin.uits.module.schedule.repository.ScheduleRepository;
import ru.stankin.uits.module.staff.entity.Teacher;
import ru.stankin.uits.module.staff.repository.TeacherRepository;

import static org.assertj.core.api.Assertions.assertThat;

class ScheduleSummaryIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private TeacherRepository teacherRepository;

    @Autowired
    private ScheduleRepository scheduleRepository;

    @Autowired
    private EntityManagerFactory entityManagerFactory;

    private Teacher chekanin;
    private Teacher razumovskiy;
    private Teacher withoutSchedule;

    @BeforeEach
    void setUp() {
        chekanin = teacher("Чеканин", "Владимир", "Алексеевич");
        razumovskiy = teacher("Разумовский", "Алексей", "Игоревич");
        withoutSchedule = teacher("Абрамов", "Пётр", null);

        saveSchedule(chekanin, 1, 1, "ИДБ-25-11");
        saveSchedule(razumovskiy, 2, 3, "ИДБ-24-03");
    }

    private Teacher teacher(String lastName, String firstName, String patronymic) {
        return teacherRepository.save(Teacher.builder()
                .lastName(lastName)
                .firstName(firstName)
                .patronymic(patronymic)
                .build());
    }

    private void saveSchedule(Teacher teacher, int weekNumber, int classTime, String group) {
        Schedule schedule = Schedule.builder()
                .teacher(teacher)
                .importedFileName("schedule.pdf")
                .build();

        ScheduleLesson first = lesson(weekNumber, classTime, group);
        first.addDate(date("16.03", "27.04", true));

        ScheduleLesson second = lesson(weekNumber, classTime + 1, group);
        second.addDate(date("17.03", "28.04", true));
        second.addDate(date("25.05", null, false));

        schedule.addLesson(first);
        schedule.addLesson(second);
        scheduleRepository.save(schedule);
    }

    private static ScheduleLesson lesson(int weekNumber, int classTime, String group) {
        return ScheduleLesson.builder()
                .weekNumber(weekNumber)
                .classTime(classTime)
                .group(group)
                .name("Технические средства информационных систем")
                .type("Лабораторная")
                .cabinet("216")
                .build();
    }

    private static ScheduleLessonDate date(String start, String end, boolean everyOtherWeek) {
        return ScheduleLessonDate.builder()
                .startDate(start)
                .endDate(end)
                .alternativelyPeriod(everyOtherWeek)
                .build();
    }

    private ScheduleResponseDto[] summary(String query) {
        ResponseEntity<ScheduleResponseDto[]> response =
                restTemplate.getForEntity("/api/public/schedule" + query, ScheduleResponseDto[].class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);

        return response.getBody();
    }

    private Statistics statistics() {
        return entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
    }

    @Test
    void withoutFilterReturnsEveryTeacherWhoHasSchedule() {
        assertThat(summary(""))
                .extracting(ScheduleResponseDto::getTeacherId)
                .containsExactly(razumovskiy.getId(), chekanin.getId())
                .doesNotContain(withoutSchedule.getId());
    }

    @Test
    void schedulesAreOrderedByTeacherLastName() {
        saveSchedule(withoutSchedule, 3, 2, "ИДБ-23-01");

        assertThat(summary(""))
                .extracting(ScheduleResponseDto::getTeacherName)
                .containsExactly("Абрамов Пётр", "Разумовский Алексей Игоревич", "Чеканин Владимир Алексеевич");
    }

    @Test
    void teacherIdFilterNarrowsSelection() {
        ScheduleResponseDto[] body = summary("?teacherId=" + chekanin.getId());

        assertThat(body).hasSize(1);
        assertThat(body[0].getTeacherId()).isEqualTo(chekanin.getId());
        assertThat(body[0].getLessons()).hasSize(2);
        assertThat(body[0].getLessons().getFirst().getGroup()).isEqualTo("ИДБ-25-11");
        assertThat(body[0].getLessons().getFirst().getDates()).hasSize(1);
        assertThat(body[0].getLessons().getLast().getDates())
                .extracting(d -> d.getStartDate())
                .containsExactly("17.03", "25.05");
    }

    @Test
    void severalTeacherIdsAreAccepted() {
        assertThat(summary("?teacherId=" + chekanin.getId() + "&teacherId=" + razumovskiy.getId()))
                .extracting(ScheduleResponseDto::getTeacherId)
                .containsExactly(razumovskiy.getId(), chekanin.getId());
    }

    @Test
    void unknownTeacherIdGivesEmptyArray() {
        assertThat(summary("?teacherId=999999")).isEmpty();
    }

    @Test
    void wholeSummaryIsFetchedInOneQuery() {
        Statistics statistics = statistics();
        statistics.setStatisticsEnabled(true);
        statistics.clear();

        summary("");

        assertThat(statistics.isStatisticsEnabled()).isTrue();
        assertThat(statistics.getPrepareStatementCount()).isEqualTo(1);
    }
}
