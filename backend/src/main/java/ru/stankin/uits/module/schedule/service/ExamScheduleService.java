package ru.stankin.uits.module.schedule.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.stankin.uits.common.exception.InvalidFileException;
import ru.stankin.uits.common.exception.InvalidRequestException;
import ru.stankin.uits.common.exception.NotFoundException;
import ru.stankin.uits.common.exception.ScheduleServiceUnavailableException;
import ru.stankin.uits.module.schedule.dto.ParsedConsultationDto;
import ru.stankin.uits.module.schedule.dto.ParsedExamDto;
import ru.stankin.uits.module.schedule.dto.ParsedExamsDto;
import ru.stankin.uits.module.schedule.dto.TeacherExamsResponseDto;
import ru.stankin.uits.module.schedule.entity.Consultation;
import ru.stankin.uits.module.schedule.entity.Exam;
import ru.stankin.uits.module.schedule.entity.ExamSchedule;
import ru.stankin.uits.module.schedule.mapper.ScheduleMapper;
import ru.stankin.uits.module.schedule.repository.ExamScheduleRepository;
import ru.stankin.uits.module.staff.entity.Teacher;
import ru.stankin.uits.module.staff.service.TeacherService;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ExamScheduleService {

    private static final int FILE_NAME_LIMIT = 256;
    private static final int GROUP_LIMIT = 128;
    private static final int NAME_LIMIT = 256;
    private static final int CABINET_LIMIT = 128;

    private final ExamScheduleRepository examScheduleRepository;
    private final TeacherService teacherService;
    private final ScheduleMapper scheduleMapper;

    @Transactional(readOnly = true)
    public void requireTeacherExists(Long teacherId) {
        teacher(teacherId);
    }

    @Transactional
    public TeacherExamsResponseDto replaceExamSchedule(Long teacherId, String fileName, ParsedExamsDto parsed) {
        List<ParsedExamDto> parsedExams = requireExams(parsed);
        Teacher teacher = teacher(teacherId);
        ExamSchedule schedule = examScheduleRepository.findWithLockByTeacherId(teacherId)
                .orElseGet(() -> ExamSchedule.builder().teacher(teacher).build());

        schedule.setImportedFileName(trim(fileName));
        schedule.getExams().clear();
        parsedExams.forEach(exam -> schedule.addExam(toExam(exam)));

        return scheduleMapper.toExamsDto(examScheduleRepository.save(schedule));
    }

    private Teacher teacher(Long teacherId) {
        try {
            return teacherService.getTeacherEntity(teacherId);
        } catch (InvalidRequestException e) {
            throw new NotFoundException("Преподаватель не найден: id=" + teacherId);
        }
    }

    private List<ParsedExamDto> requireExams(ParsedExamsDto parsed) {
        if (parsed == null || parsed.getExams() == null) {
            throw new ScheduleServiceUnavailableException(
                    "Сервис разбора расписания вернул ответ без списка экзаменов.");
        }
        if (parsed.getExams().isEmpty()) {
            throw new InvalidFileException("В файле не найдено ни одного экзамена.");
        }

        return parsed.getExams();
    }

    private Exam toExam(ParsedExamDto parsed) {
        requireComplete(parsed);
        requireFits(parsed.getGroup(), GROUP_LIMIT, "перечень групп", parsed);
        requireFits(parsed.getName(), NAME_LIMIT, "название дисциплины", parsed);
        requireFits(parsed.getCabinet(), CABINET_LIMIT, "аудитория", parsed);

        return Exam.builder()
                .examDate(date(parsed.getDate(), parsed))
                .timeStart(time(parsed.getTimeStart(), parsed))
                .timeEnd(time(parsed.getTimeEnd(), parsed))
                .group(parsed.getGroup())
                .name(parsed.getName())
                .cabinet(parsed.getCabinet())
                .consultation(toConsultation(parsed))
                .build();
    }

    private Consultation toConsultation(ParsedExamDto exam) {
        ParsedConsultationDto parsed = exam.getConsultation();
        if (parsed == null) {
            return null;
        }
        if (parsed.getDate() == null || parsed.getTime() == null || parsed.getCabinet() == null) {
            throw new ScheduleServiceUnavailableException(
                    "Сервис разбора расписания вернул консультацию без обязательных полей: "
                            + position(exam) + ".");
        }
        requireFits(parsed.getCabinet(), CABINET_LIMIT, "аудитория консультации", exam);

        return Consultation.builder()
                .date(date(parsed.getDate(), exam))
                .time(time(parsed.getTime(), exam))
                .cabinet(parsed.getCabinet())
                .build();
    }

    private void requireComplete(ParsedExamDto parsed) {
        if (parsed == null) {
            throw new ScheduleServiceUnavailableException(
                    "Сервис разбора расписания вернул пустой экзамен.");
        }
        boolean complete = parsed.getDate() != null
                && parsed.getTimeStart() != null
                && parsed.getTimeEnd() != null
                && parsed.getGroup() != null
                && parsed.getName() != null
                && parsed.getCabinet() != null;

        if (!complete) {
            throw new ScheduleServiceUnavailableException(
                    "Сервис разбора расписания вернул экзамен без обязательных полей.");
        }
    }

    private LocalDate date(String value, ParsedExamDto exam) {
        try {
            return LocalDate.parse(value);
        } catch (DateTimeParseException e) {
            throw new ScheduleServiceUnavailableException(
                    "Сервис разбора расписания вернул неразбираемую дату «%s»: %s."
                            .formatted(value, position(exam)));
        }
    }

    private LocalTime time(String value, ParsedExamDto exam) {
        try {
            return LocalTime.parse(value);
        } catch (DateTimeParseException e) {
            throw new ScheduleServiceUnavailableException(
                    "Сервис разбора расписания вернул неразбираемое время «%s»: %s."
                            .formatted(value, position(exam)));
        }
    }

    private void requireFits(String value, int limit, String field, ParsedExamDto exam) {
        if (value != null && value.length() > limit) {
            throw new InvalidFileException("%s: поле «%s» длиннее %d символов."
                    .formatted(position(exam), field, limit));
        }
    }

    private String position(ParsedExamDto exam) {
        return "экзамен %s, группа %s".formatted(exam.getDate(), exam.getGroup());
    }

    private String trim(String fileName) {
        if (fileName == null || fileName.isBlank()) {
            return null;
        }

        return fileName.length() <= FILE_NAME_LIMIT ? fileName : fileName.substring(0, FILE_NAME_LIMIT);
    }
}
