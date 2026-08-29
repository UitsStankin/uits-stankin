package ru.stankin.uits.module.schedule.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.stankin.uits.common.exception.InvalidRequestException;
import ru.stankin.uits.common.exception.NotFoundException;
import ru.stankin.uits.common.exception.ScheduleServiceUnavailableException;
import ru.stankin.uits.module.schedule.dto.ParsedLessonDateDto;
import ru.stankin.uits.module.schedule.dto.ParsedLessonDto;
import ru.stankin.uits.module.schedule.dto.ParsedScheduleDto;
import ru.stankin.uits.module.schedule.dto.ScheduleResponseDto;
import ru.stankin.uits.module.schedule.entity.Schedule;
import ru.stankin.uits.module.schedule.entity.ScheduleLesson;
import ru.stankin.uits.module.schedule.entity.ScheduleLessonDate;
import ru.stankin.uits.module.schedule.mapper.ScheduleMapper;
import ru.stankin.uits.module.schedule.repository.ScheduleRepository;
import ru.stankin.uits.module.staff.entity.Teacher;
import ru.stankin.uits.module.staff.service.TeacherService;

import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class ScheduleService {

    private static final int FILE_NAME_LIMIT = 256;

    private final ScheduleRepository scheduleRepository;
    private final TeacherService teacherService;
    private final ScheduleMapper scheduleMapper;

    @Transactional(readOnly = true)
    public void requireTeacherExists(Long teacherId) {
        teacher(teacherId);
    }

    @Transactional(readOnly = true)
    public ScheduleResponseDto getByTeacherId(Long teacherId) {
        Teacher teacher = teacher(teacherId);
        Schedule schedule = scheduleRepository.findByTeacherId(teacherId)
                .orElseGet(() -> Schedule.builder().teacher(teacher).build());

        return scheduleMapper.toDto(schedule);
    }

    @Transactional
    public ScheduleResponseDto replaceSchedule(Long teacherId, String fileName, ParsedScheduleDto parsed) {
        Teacher teacher = teacher(teacherId);
        Schedule schedule = scheduleRepository.findByTeacherId(teacherId)
                .orElseGet(() -> Schedule.builder().teacher(teacher).build());

        schedule.setImportedFileName(trim(fileName));
        schedule.getLessons().clear();
        parsed.getLessons().forEach(lesson -> schedule.addLesson(toLesson(lesson)));

        return scheduleMapper.toDto(scheduleRepository.save(schedule));
    }

    private Teacher teacher(Long teacherId) {
        try {
            return teacherService.getTeacherEntity(teacherId);
        } catch (InvalidRequestException e) {
            throw new NotFoundException("Преподаватель не найден: id=" + teacherId);
        }
    }

    private ScheduleLesson toLesson(ParsedLessonDto parsed) {
        requireComplete(parsed);

        ScheduleLesson lesson = ScheduleLesson.builder()
                .weekNumber(parsed.getWeekDay())
                .classTime(parsed.getClassTime())
                .group(parsed.getGroup())
                .name(parsed.getName())
                .type(parsed.getType())
                .subgroup(parsed.getSubgroup())
                .cabinet(parsed.getCabinet())
                .build();
        parsed.getDates().forEach(date -> lesson.addDate(toDate(date)));

        return lesson;
    }

    private ScheduleLessonDate toDate(ParsedLessonDateDto parsed) {
        boolean singleDay = Objects.equals(parsed.getStart(), parsed.getEnd());

        return ScheduleLessonDate.builder()
                .startDate(parsed.getStart())
                .endDate(singleDay ? null : parsed.getEnd())
                .alternativelyPeriod(Boolean.TRUE.equals(parsed.getEveryOtherWeek()))
                .build();
    }

    private void requireComplete(ParsedLessonDto parsed) {
        boolean complete = parsed.getWeekDay() != null
                && parsed.getClassTime() != null
                && parsed.getGroup() != null
                && parsed.getName() != null
                && parsed.getType() != null
                && !isEmpty(parsed.getDates());

        if (!complete) {
            throw new ScheduleServiceUnavailableException(
                    "Сервис разбора расписания вернул занятие без обязательных полей.");
        }
    }

    private boolean isEmpty(List<ParsedLessonDateDto> dates) {
        return dates == null || dates.isEmpty();
    }

    private String trim(String fileName) {
        if (fileName == null || fileName.isBlank()) {
            return null;
        }

        return fileName.length() <= FILE_NAME_LIMIT ? fileName : fileName.substring(0, FILE_NAME_LIMIT);
    }
}
