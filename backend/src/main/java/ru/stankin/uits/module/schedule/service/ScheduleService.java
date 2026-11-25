package ru.stankin.uits.module.schedule.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.stankin.uits.common.exception.InvalidFileException;
import ru.stankin.uits.common.exception.InvalidRequestException;
import ru.stankin.uits.common.exception.NotFoundException;
import ru.stankin.uits.common.exception.ScheduleServiceUnavailableException;
import ru.stankin.uits.module.schedule.dto.ExamScheduleFilesResponseDto;
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
import ru.stankin.uits.module.staff.enums.ExamScheduleType;
import ru.stankin.uits.module.staff.service.TeacherService;

import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.Collection;
import java.util.List;
import java.util.Objects;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class ScheduleService {

    private static final int MIN_CLASS_TIME = 1;
    private static final int MAX_CLASS_TIME = 10;
    private static final Pattern TIME_PATTERN = Pattern.compile("^\\d{2}:\\d{2}$");

    private static final int FILE_NAME_LIMIT = 256;
    private static final int GROUP_LIMIT = 128;
    private static final int NAME_LIMIT = 256;
    private static final int TYPE_LIMIT = 128;
    private static final int CABINET_LIMIT = 128;
    private static final int SUBGROUP_LIMIT = 128;

    private static final Sort SUMMARY_SORT = Sort.by("teacher.lastName", "teacher.firstName", "teacher.id");

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

    @Transactional(readOnly = true)
    public List<ScheduleResponseDto> getSummary(Collection<Long> teacherIds) {
        List<Schedule> schedules = teacherIds == null || teacherIds.isEmpty()
                ? scheduleRepository.findByTeacherArchivedAtIsNull(SUMMARY_SORT)
                : scheduleRepository.findByTeacherIdInAndTeacherArchivedAtIsNull(teacherIds, SUMMARY_SORT);

        return schedules.stream().map(scheduleMapper::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<ExamScheduleFilesResponseDto> getExamScheduleFiles(ExamScheduleType type) {
        return teacherService.getWithExamSchedule(type).stream()
                .map(scheduleMapper::toExamFilesDto)
                .toList();
    }

    @Transactional
    public ScheduleResponseDto replaceSchedule(Long teacherId, String fileName, ParsedScheduleDto parsed) {
        List<ParsedLessonDto> parsedLessons = requireLessons(parsed);
        Teacher teacher = teacher(teacherId);
        Schedule schedule = scheduleRepository.findWithLockByTeacherId(teacherId)
                .orElseGet(() -> Schedule.builder().teacher(teacher).build());

        schedule.setImportedFileName(trim(fileName));
        schedule.getLessons().clear();
        parsedLessons.forEach(lesson -> schedule.addLesson(toLesson(lesson)));

        return scheduleMapper.toDto(scheduleRepository.save(schedule));
    }

    private Teacher teacher(Long teacherId) {
        try {
            return teacherService.getTeacherEntity(teacherId);
        } catch (InvalidRequestException e) {
            throw new NotFoundException("Преподаватель не найден: id=" + teacherId);
        }
    }

    private List<ParsedLessonDto> requireLessons(ParsedScheduleDto parsed) {
        if (parsed == null || parsed.getLessons() == null) {
            throw new ScheduleServiceUnavailableException(
                    "Сервис разбора расписания вернул ответ без списка занятий.");
        }
        if (parsed.getLessons().isEmpty()) {
            throw new InvalidFileException("В файле не найдено ни одного занятия.");
        }

        return parsed.getLessons();
    }

    private ScheduleLesson toLesson(ParsedLessonDto parsed) {
        requireComplete(parsed);
        requireFits(parsed.getGroup(), GROUP_LIMIT, "перечень групп", parsed);
        requireFits(parsed.getName(), NAME_LIMIT, "название занятия", parsed);
        requireFits(parsed.getType(), TYPE_LIMIT, "вид занятия", parsed);
        requireFits(parsed.getCabinet(), CABINET_LIMIT, "аудитория", parsed);
        requireFits(parsed.getSubgroup(), SUBGROUP_LIMIT, "подгруппа", parsed);

        ScheduleLesson lesson = ScheduleLesson.builder()
                .weekNumber(parsed.getWeekDay())
                .classTime(parsed.getClassTime())
                .timeStart(parsed.getTimeStart())
                .timeEnd(parsed.getTimeEnd())
                .group(parsed.getGroup())
                .name(parsed.getName())
                .type(parsed.getType())
                .subgroup(parsed.getSubgroup())
                .cabinet(parsed.getCabinet())
                .build();
        parsed.getDates().forEach(date -> lesson.addDate(toDate(date, parsed)));

        return lesson;
    }

    private ScheduleLessonDate toDate(ParsedLessonDateDto parsed, ParsedLessonDto lesson) {
        if (parsed == null || parsed.getStart() == null) {
            throw new ScheduleServiceUnavailableException(
                    "Сервис разбора расписания вернул занятие с пустой датой: " + position(lesson) + ".");
        }
        boolean singleDay = Objects.equals(parsed.getStart(), parsed.getEnd());

        return ScheduleLessonDate.builder()
                .startDate(parsed.getStart())
                .endDate(singleDay ? null : parsed.getEnd())
                .alternativelyPeriod(Boolean.TRUE.equals(parsed.getEveryOtherWeek()))
                .build();
    }

    private void requireComplete(ParsedLessonDto parsed) {
        if (parsed == null) {
            throw new ScheduleServiceUnavailableException(
                    "Сервис разбора расписания вернул пустое занятие.");
        }
        boolean complete = parsed.getWeekDay() != null
                && parsed.getClassTime() != null
                && parsed.getClassTime() >= MIN_CLASS_TIME
                && parsed.getClassTime() <= MAX_CLASS_TIME
                && parsed.getGroup() != null
                && parsed.getName() != null
                && parsed.getType() != null
                && !isEmpty(parsed.getDates());

        if (!complete) {
            throw new ScheduleServiceUnavailableException(
                    "Сервис разбора расписания вернул занятие без обязательных полей.");
        }
        LocalTime startTime = parseTime(parsed.getTimeStart(), parsed);
        LocalTime endTime = parseTime(parsed.getTimeEnd(), parsed);
        if ((startTime == null) != (endTime == null)) {
            throw new ScheduleServiceUnavailableException(
                    "Сервис разбора расписания вернул неполный интервал времени «%s - %s»: %s."
                            .formatted(parsed.getTimeStart(), parsed.getTimeEnd(), position(parsed)));
        }
        if (startTime != null && !startTime.isBefore(endTime)) {
            throw new ScheduleServiceUnavailableException(
                    "Сервис разбора расписания вернул некорректный интервал времени «%s - %s»: %s."
                            .formatted(parsed.getTimeStart(), parsed.getTimeEnd(), position(parsed)));
        }
    }

    private LocalTime parseTime(String value, ParsedLessonDto lesson) {
        if (value == null) {
            return null;
        }
        if (!TIME_PATTERN.matcher(value).matches()) {
            throw new ScheduleServiceUnavailableException(
                    "Сервис разбора расписания вернул неразбираемое время «%s»: %s."
                            .formatted(value, position(lesson)));
        }
        try {
            return LocalTime.parse(value);
        } catch (DateTimeParseException e) {
            throw new ScheduleServiceUnavailableException(
                    "Сервис разбора расписания вернул неразбираемое время «%s»: %s."
                            .formatted(value, position(lesson)));
        }
    }

    private void requireFits(String value, int limit, String field, ParsedLessonDto lesson) {
        if (value != null && value.length() > limit) {
            throw new InvalidFileException("%s: поле «%s» длиннее %d символов."
                    .formatted(position(lesson), field, limit));
        }
    }

    private String position(ParsedLessonDto lesson) {
        return "день %d, пара %d".formatted(lesson.getWeekDay(), lesson.getClassTime());
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
