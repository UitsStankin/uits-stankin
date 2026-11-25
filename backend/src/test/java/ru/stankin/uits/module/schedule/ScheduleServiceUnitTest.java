package ru.stankin.uits.module.schedule;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mapstruct.factory.Mappers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ru.stankin.uits.common.exception.ScheduleServiceUnavailableException;
import ru.stankin.uits.module.schedule.dto.ParsedLessonDateDto;
import ru.stankin.uits.module.schedule.dto.ParsedLessonDto;
import ru.stankin.uits.module.schedule.dto.ParsedScheduleDto;
import ru.stankin.uits.module.schedule.dto.ScheduleResponseDto;
import ru.stankin.uits.module.schedule.entity.Schedule;
import ru.stankin.uits.module.schedule.entity.ScheduleLesson;
import ru.stankin.uits.module.schedule.mapper.ScheduleMapper;
import ru.stankin.uits.module.schedule.repository.ScheduleRepository;
import ru.stankin.uits.module.staff.entity.Teacher;
import ru.stankin.uits.module.staff.service.TeacherService;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class ScheduleServiceUnitTest {

    @Mock
    private ScheduleRepository scheduleRepository;

    @Mock
    private TeacherService teacherService;

    private final ScheduleMapper scheduleMapper = Mappers.getMapper(ScheduleMapper.class);

    private ru.stankin.uits.module.schedule.service.ScheduleService scheduleService;
    private Teacher teacher;

    @BeforeEach
    void setUp() {
        scheduleService = new ru.stankin.uits.module.schedule.service.ScheduleService(
                scheduleRepository, teacherService, scheduleMapper);
        teacher = Teacher.builder()
                .id(7L)
                .lastName("Чеканин")
                .firstName("Владимир")
                .build();
    }

    private static ParsedLessonDto lesson(int classTime, String timeStart, String timeEnd, String group) {
        return ParsedLessonDto.builder()
                .weekDay(5)
                .classTime(classTime)
                .timeStart(timeStart)
                .timeEnd(timeEnd)
                .group(group)
                .name("Киберфизические системы")
                .type("Семинар")
                .dates(List.of(ParsedLessonDateDto.builder()
                        .start("09.10")
                        .end("30.10")
                        .everyOtherWeek(false)
                        .build()))
                .build();
    }

    @Test
    void replaceSchedulePropagatesTimeStartTimeEndAndTenSlots() {
        given(teacherService.getTeacherEntity(7L)).willReturn(teacher);
        given(scheduleRepository.findWithLockByTeacherId(7L)).willReturn(Optional.empty());
        given(scheduleRepository.save(any(Schedule.class))).willAnswer(invocation -> invocation.getArgument(0));

        ParsedScheduleDto parsed = ParsedScheduleDto.builder()
                .lessons(List.of(lesson(10, "21:50", "23:20", "ЭЛ-КС-25-01")))
                .build();

        ScheduleResponseDto result = scheduleService.replaceSchedule(7L, "schedule.pdf", parsed);

        assertThat(result.getLessons()).hasSize(1);
        var dto = result.getLessons().getFirst();
        assertThat(dto.getClassTime()).isEqualTo(10);
        assertThat(dto.getTimeStart()).isEqualTo("21:50");
        assertThat(dto.getTimeEnd()).isEqualTo("23:20");
        assertThat(dto.getGroup()).isEqualTo("ЭЛ-КС-25-01");
    }

    @Test
    void replaceScheduleAllowsNullTimesForLegacyCompatibility() {
        given(teacherService.getTeacherEntity(7L)).willReturn(teacher);
        given(scheduleRepository.findWithLockByTeacherId(7L)).willReturn(Optional.empty());
        given(scheduleRepository.save(any(Schedule.class))).willAnswer(invocation -> invocation.getArgument(0));

        ParsedScheduleDto parsed = ParsedScheduleDto.builder()
                .lessons(List.of(lesson(1, null, null, "ИДБ-25-11")))
                .build();

        ScheduleResponseDto result = scheduleService.replaceSchedule(7L, "legacy.pdf", parsed);

        var dto = result.getLessons().getFirst();
        assertThat(dto.getTimeStart()).isNull();
        assertThat(dto.getTimeEnd()).isNull();
    }

    @Test
    void getByTeacherIdPreservesNullTimesOnLegacyRows() {
        Schedule schedule = Schedule.builder().teacher(teacher).build();
        schedule.addLesson(ScheduleLesson.builder()
                .weekNumber(1)
                .classTime(1)
                .group("ИДБ-25-11")
                .name("Физика")
                .type("Лекция")
                .build());
        given(teacherService.getTeacherEntity(7L)).willReturn(teacher);
        given(scheduleRepository.findByTeacherId(7L)).willReturn(Optional.of(schedule));

        ScheduleResponseDto result = scheduleService.getByTeacherId(7L);

        assertThat(result.getLessons()).hasSize(1);
        assertThat(result.getLessons().getFirst().getTimeStart()).isNull();
        assertThat(result.getLessons().getFirst().getTimeEnd()).isNull();
    }

    @Test
    void replaceScheduleRejectsInvalidTimeFormat() {
        given(teacherService.getTeacherEntity(7L)).willReturn(teacher);
        given(scheduleRepository.findWithLockByTeacherId(7L)).willReturn(Optional.empty());
        ParsedScheduleDto parsed = ParsedScheduleDto.builder()
                .lessons(List.of(lesson(1, "8:30", "10:05", "ИДБ-25-11")))
                .build();

        assertThatThrownBy(() -> scheduleService.replaceSchedule(7L, "bad.pdf", parsed))
                .isInstanceOf(ScheduleServiceUnavailableException.class);
    }

    @Test
    void replaceScheduleRejectsOutOfRangeWallClockTime() {
        given(teacherService.getTeacherEntity(7L)).willReturn(teacher);
        given(scheduleRepository.findWithLockByTeacherId(7L)).willReturn(Optional.empty());
        ParsedScheduleDto parsed = ParsedScheduleDto.builder()
                .lessons(List.of(lesson(1, "25:00", "26:00", "ИДБ-25-11")))
                .build();

        assertThatThrownBy(() -> scheduleService.replaceSchedule(7L, "bad.pdf", parsed))
                .isInstanceOf(ScheduleServiceUnavailableException.class);
    }

    @Test
    void replaceScheduleRejectsReversedTimes() {
        given(teacherService.getTeacherEntity(7L)).willReturn(teacher);
        given(scheduleRepository.findWithLockByTeacherId(7L)).willReturn(Optional.empty());
        ParsedScheduleDto parsed = ParsedScheduleDto.builder()
                .lessons(List.of(lesson(1, "10:05", "08:30", "ИДБ-25-11")))
                .build();

        assertThatThrownBy(() -> scheduleService.replaceSchedule(7L, "bad.pdf", parsed))
                .isInstanceOf(ScheduleServiceUnavailableException.class);
    }

    @Test
    void replaceScheduleRejectsClassTimeOutOfRange() {
        given(teacherService.getTeacherEntity(7L)).willReturn(teacher);
        given(scheduleRepository.findWithLockByTeacherId(7L)).willReturn(Optional.empty());
        ParsedScheduleDto above = ParsedScheduleDto.builder()
                .lessons(List.of(lesson(11, "21:50", "23:20", "ИДБ-25-11")))
                .build();
        ParsedScheduleDto zero = ParsedScheduleDto.builder()
                .lessons(List.of(lesson(0, "08:30", "10:05", "ИДБ-25-11")))
                .build();

        assertThatThrownBy(() -> scheduleService.replaceSchedule(7L, "bad.pdf", above))
                .isInstanceOf(ScheduleServiceUnavailableException.class);
        assertThatThrownBy(() -> scheduleService.replaceSchedule(7L, "bad.pdf", zero))
                .isInstanceOf(ScheduleServiceUnavailableException.class);
    }

    @Test
    void replaceScheduleRejectsHalfIntervalTimes() {
        given(teacherService.getTeacherEntity(7L)).willReturn(teacher);
        given(scheduleRepository.findWithLockByTeacherId(7L)).willReturn(Optional.empty());
        ParsedScheduleDto onlyStart = ParsedScheduleDto.builder()
                .lessons(List.of(lesson(1, "08:30", null, "ИДБ-25-11")))
                .build();
        ParsedScheduleDto onlyEnd = ParsedScheduleDto.builder()
                .lessons(List.of(lesson(1, null, "10:05", "ИДБ-25-11")))
                .build();

        assertThatThrownBy(() -> scheduleService.replaceSchedule(7L, "bad.pdf", onlyStart))
                .isInstanceOf(ScheduleServiceUnavailableException.class);
        assertThatThrownBy(() -> scheduleService.replaceSchedule(7L, "bad.pdf", onlyEnd))
                .isInstanceOf(ScheduleServiceUnavailableException.class);
    }
}
