package ru.stankin.uits.module.gradesheets.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import ru.stankin.uits.common.exception.InvalidFileException;
import ru.stankin.uits.module.gradesheets.client.GradeSheetParseClient;
import ru.stankin.uits.module.gradesheets.dto.GradeSheetImportResponseDto;
import ru.stankin.uits.module.gradesheets.dto.ImportedGradeSheetDto;
import ru.stankin.uits.module.gradesheets.dto.ParsedGradeSheetDto;
import ru.stankin.uits.module.gradesheets.dto.ParsedGradeSheetMarkDto;
import ru.stankin.uits.module.gradesheets.dto.ParsedGradeSheetStudentDto;
import ru.stankin.uits.module.gradesheets.dto.ParsedGradeSheetsDto;
import ru.stankin.uits.module.gradesheets.entity.GradeSheet;
import ru.stankin.uits.module.gradesheets.entity.GradeSheetMark;
import ru.stankin.uits.module.gradesheets.entity.GradeSheetStudent;
import ru.stankin.uits.module.gradesheets.repository.GradeSheetRepository;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class GradeSheetImportService {

    private static final long MAX_WORKBOOK_BYTES = 5L * 1024 * 1024;

    private static final int DISCIPLINE_LIMIT = 256;
    private static final int GROUP_LIMIT = 64;
    private static final int SEMESTER_LIMIT = 128;
    private static final int DIRECTION_LIMIT = 256;
    private static final int DEPARTMENT_LIMIT = 128;
    private static final int TEACHERS_LIMIT = 256;
    private static final int FILE_NAME_LIMIT = 256;
    private static final int NAME_LIMIT = 50;
    private static final int MARK_LIMIT = 128;

    private final GradeSheetParseClient gradeSheetParseClient;
    private final GradeSheetRepository gradeSheetRepository;

    @Transactional
    public GradeSheetImportResponseDto importFromWorkbook(MultipartFile file) {
        requireUsable(file);

        ParsedGradeSheetsDto parsed =
                gradeSheetParseClient.parse(bytesOf(file), file.getOriginalFilename());
        List<ParsedGradeSheetDto> sheets = parsed.getSheets();
        if (sheets == null || sheets.isEmpty()) {
            throw new InvalidFileException("В книге нет ни одной ведомости.");
        }

        List<ImportedGradeSheetDto> imported = sheets.stream()
                .map(sheet -> save(sheet, file.getOriginalFilename()))
                .toList();
        return GradeSheetImportResponseDto.builder().sheets(imported).build();
    }

    private ImportedGradeSheetDto save(ParsedGradeSheetDto parsed, String filename) {
        String sheetName = Objects.requireNonNullElse(text(parsed.getSheetName()), "без имени");
        String discipline = required(parsed.getDiscipline(), "дисциплина", sheetName, DISCIPLINE_LIMIT);
        String group = required(parsed.getGroup(), "группа", sheetName, GROUP_LIMIT);
        String semester = required(parsed.getSemester(), "семестр", sheetName, SEMESTER_LIMIT);

        GradeSheet sheet = gradeSheetRepository
                .findWithLockByDisciplineNameAndGroupAndSemester(discipline, group, semester)
                .orElseGet(() -> GradeSheet.builder().build());

        sheet.setDisciplineName(discipline);
        sheet.setGroup(group);
        sheet.setSemester(semester);
        sheet.setDirection(fit(parsed.getDirection(), DIRECTION_LIMIT, "направление", sheetName));
        sheet.setDepartment(fit(parsed.getDepartment(), DEPARTMENT_LIMIT, "кафедра", sheetName));
        sheet.setImportedTeachers(
                fit(joinTeachers(parsed.getTeachers()), TEACHERS_LIMIT, "преподаватели", sheetName));
        sheet.setImportedFileName(fit(filename, FILE_NAME_LIMIT, "имя файла", sheetName));
        sheet.setImportedAt(OffsetDateTime.now());

        sheet.getStudents().clear();
        for (ParsedGradeSheetStudentDto student : orEmpty(parsed.getStudents())) {
            sheet.addStudent(toStudent(student, sheetName));
        }

        GradeSheet saved = gradeSheetRepository.save(sheet);
        return ImportedGradeSheetDto.builder()
                .id(saved.getId())
                .sheetName(sheetName)
                .discipline(discipline)
                .group(group)
                .semester(semester)
                .studentCount(saved.getStudents().size())
                .warnings(List.copyOf(orEmpty(parsed.getWarnings())))
                .build();
    }

    private GradeSheetStudent toStudent(ParsedGradeSheetStudentDto parsed, String sheetName) {
        GradeSheetStudent student = GradeSheetStudent.builder()
                .studentNumber(parsed.getNumber())
                .lastName(required(parsed.getLastName(), "фамилия", sheetName, NAME_LIMIT))
                .firstName(fit(parsed.getFirstName(), NAME_LIMIT, "имя", sheetName))
                .patronymic(fit(parsed.getPatronymic(), NAME_LIMIT, "отчество", sheetName))
                .build();
        for (ParsedGradeSheetMarkDto mark : orEmpty(parsed.getMarks())) {
            if (isEmpty(mark)) {
                continue;
            }
            student.addMark(toMark(mark, sheetName));
        }
        return student;
    }

    private GradeSheetMark toMark(ParsedGradeSheetMarkDto parsed, String sheetName) {
        return GradeSheetMark.builder()
                .block(required(parsed.getBlock(), "блок оценок", sheetName, MARK_LIMIT))
                .score(parsed.getScore())
                .text(fit(parsed.getText(), MARK_LIMIT, "значение оценки", sheetName))
                .grade(fit(parsed.getGrade(), MARK_LIMIT, "оценка", sheetName))
                .date(date(parsed.getDate(), sheetName))
                .teacherName(fit(parsed.getTeacher(), MARK_LIMIT, "преподаватель в оценке", sheetName))
                .build();
    }

    private boolean isEmpty(ParsedGradeSheetMarkDto mark) {
        return mark.getScore() == null
                && text(mark.getText()) == null
                && text(mark.getGrade()) == null
                && text(mark.getDate()) == null
                && text(mark.getTeacher()) == null;
    }

    private LocalDate date(String value, String sheetName) {
        String text = text(value);
        if (text == null) {
            return null;
        }
        try {
            return LocalDate.parse(text);
        } catch (DateTimeParseException e) {
            throw new InvalidFileException(
                    "В листе '" + sheetName + "' дата оценки пришла в неизвестном виде: '" + text + "'.");
        }
    }

    private String joinTeachers(List<String> teachers) {
        return orEmpty(teachers).stream()
                .map(this::text)
                .filter(Objects::nonNull)
                .reduce((left, right) -> left + ", " + right)
                .orElse(null);
    }

    private String required(String value, String field, String sheetName, int limit) {
        String text = text(value);
        if (text == null) {
            throw new InvalidFileException(
                    "В листе '" + sheetName + "' не заполнено обязательное поле: " + field + ".");
        }
        return fit(text, limit, field, sheetName);
    }

    private String fit(String value, int limit, String field, String sheetName) {
        String text = text(value);
        if (text != null && text.length() > limit) {
            throw new InvalidFileException("В листе '" + sheetName + "' поле '" + field
                    + "' длиннее " + limit + " символов.");
        }
        return text;
    }

    private String text(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private <T> List<T> orEmpty(List<T> values) {
        return values == null ? List.of() : values;
    }

    private void requireUsable(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidFileException("Файл ведомости не выбран.");
        }
        if (file.getSize() > MAX_WORKBOOK_BYTES) {
            throw new InvalidFileException(
                    "Файл ведомости больше " + MAX_WORKBOOK_BYTES / (1024 * 1024) + " МБ.");
        }
    }

    private byte[] bytesOf(MultipartFile file) {
        try {
            return file.getBytes();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
