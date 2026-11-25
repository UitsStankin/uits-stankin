package ru.stankin.uits.module.staff.service;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.stankin.uits.common.validation.HtmlSanitizer;
import ru.stankin.uits.common.validation.PhoneRules;
import ru.stankin.uits.module.staff.dto.DuplicateStrategy;
import ru.stankin.uits.module.staff.dto.ParsedStaffRowDto;
import ru.stankin.uits.module.staff.dto.TeacherImportAction;
import ru.stankin.uits.module.staff.dto.TeacherImportItemDto;
import ru.stankin.uits.module.staff.dto.TeacherImportResponseDto;
import ru.stankin.uits.module.staff.dto.TeacherRequestDto;
import ru.stankin.uits.module.staff.entity.Teacher;
import ru.stankin.uits.module.staff.enums.TeacherDegree;
import ru.stankin.uits.module.staff.enums.TeacherRank;
import ru.stankin.uits.module.staff.repository.TeacherRepository;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.IdentityHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class TeacherImportProcessor {

    private static final int NAME_MAX_LENGTH = 150;
    private static final int POSITION_MAX_LENGTH = 100;
    private static final int PHONE_MAX_LENGTH = 50;
    private static final int EMAIL_MAX_LENGTH = 254;
    private static final int MESSENGER_MAX_LENGTH = 50;

    private static final Pattern PHONE_PATTERN = Pattern.compile(PhoneRules.REGEXP);
    private static final Pattern COMPACT_STRIP_PATTERN = Pattern.compile("[.\\s\\-]+");

    private static final Map<String, TeacherDegree> DEGREE_ALIASES = buildDegreeAliases();
    private static final Map<String, TeacherRank> RANK_ALIASES = buildRankAliases();

    private final TeacherRepository teacherRepository;
    private final Validator validator;

    @Transactional(readOnly = true)
    public TeacherImportResponseDto preview(List<ParsedStaffRowDto> rows, DuplicateStrategy onDuplicate) {
        return process(rows, true, onDuplicate);
    }

    @Transactional
    public TeacherImportResponseDto apply(List<ParsedStaffRowDto> rows, DuplicateStrategy onDuplicate) {
        return process(rows, false, onDuplicate);
    }

    private TeacherImportResponseDto process(
            List<ParsedStaffRowDto> rows,
            boolean dryRun,
            DuplicateStrategy onDuplicate
    ) {
        List<Teacher> existingTeachers = teacherRepository.findByArchivedAtIsNullOrderByIdAsc();
        Map<String, Teacher> dbByEmail = new HashMap<>();
        Map<String, Teacher> dbByName = new HashMap<>();
        Map<Teacher, String> activeEmailByTeacher = new IdentityHashMap<>();
        Map<Teacher, String> activeNameByTeacher = new IdentityHashMap<>();
        Map<Teacher, String> activePatronymicByTeacher = new IdentityHashMap<>();

        for (Teacher existing : existingTeachers) {
            String email = trimToNull(existing.getEmail());
            if (email != null) {
                String lowerEmail = email.toLowerCase(Locale.ROOT);
                dbByEmail.putIfAbsent(lowerEmail, existing);
                activeEmailByTeacher.put(existing, lowerEmail);
            }
            String existingPatronymic = trimToNull(existing.getPatronymic());
            String nameKey = fullNameKey(
                    trimToNull(existing.getLastName()),
                    trimToNull(existing.getFirstName()),
                    existingPatronymic
            );
            if (nameKey != null) {
                dbByName.putIfAbsent(nameKey, existing);
                activeNameByTeacher.put(existing, nameKey);
            }
            activePatronymicByTeacher.put(existing, existingPatronymic);
        }

        Map<String, Integer> seenEmails = new HashMap<>();
        Map<String, Integer> seenNames = new HashMap<>();
        List<TeacherImportItemDto> items = new ArrayList<>(rows.size());

        int created = 0;
        int updated = 0;
        int skipped = 0;
        int failed = 0;

        for (ParsedStaffRowDto row : rows) {
            TeacherImportItemDto item = processRow(
                    row, dryRun, onDuplicate,
                    dbByEmail, dbByName, activeEmailByTeacher, activeNameByTeacher, activePatronymicByTeacher,
                    seenEmails, seenNames
            );
            items.add(item);
            switch (item.getAction()) {
                case CREATE -> created++;
                case UPDATE -> updated++;
                case SKIP -> skipped++;
                case ERROR -> failed++;
            }
        }

        return TeacherImportResponseDto.builder()
                .dryRun(dryRun)
                .totalRows(rows.size())
                .created(created)
                .updated(updated)
                .skipped(skipped)
                .failed(failed)
                .items(items)
                .build();
    }

    private TeacherImportItemDto processRow(
            ParsedStaffRowDto row,
            boolean dryRun,
            DuplicateStrategy onDuplicate,
            Map<String, Teacher> dbByEmail,
            Map<String, Teacher> dbByName,
            Map<Teacher, String> activeEmailByTeacher,
            Map<Teacher, String> activeNameByTeacher,
            Map<Teacher, String> activePatronymicByTeacher,
            Map<String, Integer> seenEmails,
            Map<String, Integer> seenNames
    ) {
        int rowNumber = row.getRowNumber() != null ? row.getRowNumber() : 0;
        String lastName = trimToNull(row.getLastName());
        String firstName = trimToNull(row.getFirstName());
        String patronymic = trimToNull(row.getPatronymic());
        String position = trimToNull(row.getPosition());
        String category = trimToNull(row.getCategory());
        String fullName = buildFullName(lastName, firstName, patronymic);

        if (category != null && !category.toLowerCase(Locale.ROOT).contains("ппс")) {
            return TeacherImportItemDto.builder()
                    .rowNumber(rowNumber)
                    .fullName(fullName)
                    .position(position)
                    .action(TeacherImportAction.SKIP)
                    .teacherId(null)
                    .reason("Категория «" + category + "» не относится к ППС")
                    .errors(List.of())
                    .warnings(List.of())
                    .build();
        }

        List<String> errors = new ArrayList<>();
        if (row.getParseErrors() != null) {
            errors.addAll(row.getParseErrors());
        }

        validateRequiredAndLength(lastName, "Фамилия", NAME_MAX_LENGTH, "Фамилия обязательна", errors);
        validateRequiredAndLength(firstName, "Имя", NAME_MAX_LENGTH, "Имя обязательно", errors);
        validateRequiredAndLength(patronymic, "Отчество", NAME_MAX_LENGTH, null, errors);
        validateRequiredAndLength(position, "Должность", POSITION_MAX_LENGTH, "Должность обязательна", errors);

        TeacherDegree degree = parseDegree(trimToNull(row.getDegree()), errors);
        TeacherRank rank = parseRank(trimToNull(row.getRank()), errors);
        String email = validateAndNormalizeEmail(trimToNull(row.getEmail()), errors);
        String phoneNumber = validatePhone(trimToNull(row.getPhoneNumber()), errors);
        String messenger = validateMaxLength(trimToNull(row.getMessenger()), "Мессенджер", MESSENGER_MAX_LENGTH, errors);
        Integer experience = validateExperience(row.getExperience(), "Стаж", errors);
        Integer professionalExperience = validateExperience(
                row.getProfessionalExperience(), "Стаж по специальности", errors);

        if (!errors.isEmpty()) {
            return errorItem(rowNumber, fullName, position, errors);
        }

        String nameKey = fullNameKey(lastName, firstName, patronymic);
        List<String> duplicateErrors = new ArrayList<>();
        Integer dupByEmailRow = email != null ? seenEmails.get(email) : null;
        Integer dupByNameRow = nameKey != null ? seenNames.get(nameKey) : null;
        if (dupByEmailRow != null) {
            duplicateErrors.add("Дубликат записи из строки " + dupByEmailRow);
        }
        if (dupByNameRow != null && !Objects.equals(dupByNameRow, dupByEmailRow)) {
            duplicateErrors.add("Дубликат записи из строки " + dupByNameRow);
        }
        if (!duplicateErrors.isEmpty()) {
            return errorItem(rowNumber, fullName, position, duplicateErrors);
        }

        if (email != null) {
            seenEmails.put(email, rowNumber);
        }
        if (nameKey != null) {
            seenNames.put(nameKey, rowNumber);
        }

        String education = sanitizeRichText(trimToNull(row.getEducation()));
        String qualification = sanitizeRichText(trimToNull(row.getQualification()));
        String bio = trimToNull(row.getBio());

        Teacher existing = email != null ? dbByEmail.get(email) : null;
        if (existing == null && nameKey != null) {
            existing = dbByName.get(nameKey);
        }

        if (existing != null) {
            if (onDuplicate == DuplicateStrategy.SKIP) {
                return TeacherImportItemDto.builder()
                        .rowNumber(rowNumber)
                        .fullName(fullName)
                        .position(position)
                        .action(TeacherImportAction.SKIP)
                        .teacherId(existing.getId())
                        .reason("Карточка уже существует")
                        .errors(List.of())
                        .warnings(List.of())
                        .build();
            }

            String prevEmail = activeEmailByTeacher.get(existing);
            String effectiveEmail = email != null ? email : prevEmail;
            if (!Objects.equals(prevEmail, effectiveEmail)) {
                if (prevEmail != null) {
                    dbByEmail.remove(prevEmail, existing);
                }
                if (effectiveEmail != null) {
                    dbByEmail.putIfAbsent(effectiveEmail, existing);
                }
                activeEmailByTeacher.put(existing, effectiveEmail);
            }

            String prevPatronymic = activePatronymicByTeacher.get(existing);
            String effectivePatronymic = patronymic != null ? patronymic : prevPatronymic;
            if (!Objects.equals(prevPatronymic, effectivePatronymic)) {
                activePatronymicByTeacher.put(existing, effectivePatronymic);
            }

            String prevNameKey = activeNameByTeacher.get(existing);
            String effectiveNameKey = fullNameKey(lastName, firstName, effectivePatronymic);
            if (!Objects.equals(prevNameKey, effectiveNameKey)) {
                if (prevNameKey != null) {
                    dbByName.remove(prevNameKey, existing);
                }
                if (effectiveNameKey != null) {
                    dbByName.putIfAbsent(effectiveNameKey, existing);
                }
                activeNameByTeacher.put(existing, effectiveNameKey);
            }

            if (!dryRun) {
                applyNonEmptyUpdates(
                        existing,
                        lastName, firstName, patronymic, position,
                        degree, rank, email, phoneNumber, messenger,
                        experience, professionalExperience, education, qualification, bio
                );
                teacherRepository.save(existing);
            }

            return TeacherImportItemDto.builder()
                    .rowNumber(rowNumber)
                    .fullName(fullName)
                    .position(position)
                    .action(TeacherImportAction.UPDATE)
                    .teacherId(existing.getId())
                    .reason(null)
                    .errors(List.of())
                    .warnings(List.of())
                    .build();
        }

        Long createdId = null;
        if (!dryRun) {
            Teacher teacher = Teacher.builder()
                    .lastName(lastName)
                    .firstName(firstName)
                    .patronymic(patronymic)
                    .position(position)
                    .degree(degree)
                    .rank(rank)
                    .email(email)
                    .phoneNumber(phoneNumber)
                    .messenger(messenger)
                    .experience(experience)
                    .professionalExperience(professionalExperience)
                    .education(education)
                    .qualification(qualification)
                    .bio(bio)
                    .build();
            Teacher saved = teacherRepository.save(teacher);
            createdId = saved.getId();
            if (email != null) {
                dbByEmail.putIfAbsent(email, saved);
                activeEmailByTeacher.put(saved, email);
            }
            if (nameKey != null) {
                dbByName.putIfAbsent(nameKey, saved);
                activeNameByTeacher.put(saved, nameKey);
            }
            activePatronymicByTeacher.put(saved, patronymic);
        }

        return TeacherImportItemDto.builder()
                .rowNumber(rowNumber)
                .fullName(fullName)
                .position(position)
                .action(TeacherImportAction.CREATE)
                .teacherId(createdId)
                .reason(null)
                .errors(List.of())
                .warnings(List.of())
                .build();
    }

    private void applyNonEmptyUpdates(
            Teacher target,
            String lastName,
            String firstName,
            String patronymic,
            String position,
            TeacherDegree degree,
            TeacherRank rank,
            String email,
            String phoneNumber,
            String messenger,
            Integer experience,
            Integer professionalExperience,
            String education,
            String qualification,
            String bio
    ) {
        target.setLastName(lastName);
        target.setFirstName(firstName);
        target.setPosition(position);
        if (patronymic != null) {
            target.setPatronymic(patronymic);
        }
        if (degree != null) {
            target.setDegree(degree);
        }
        if (rank != null) {
            target.setRank(rank);
        }
        if (email != null) {
            target.setEmail(email);
        }
        if (phoneNumber != null) {
            target.setPhoneNumber(phoneNumber);
        }
        if (messenger != null) {
            target.setMessenger(messenger);
        }
        if (experience != null) {
            target.setExperience(experience);
        }
        if (professionalExperience != null) {
            target.setProfessionalExperience(professionalExperience);
        }
        if (education != null) {
            target.setEducation(education);
        }
        if (qualification != null) {
            target.setQualification(qualification);
        }
        if (bio != null) {
            target.setBio(bio);
        }
    }

    private TeacherImportItemDto errorItem(int rowNumber, String fullName, String position, List<String> errors) {
        return TeacherImportItemDto.builder()
                .rowNumber(rowNumber)
                .fullName(fullName)
                .position(position)
                .action(TeacherImportAction.ERROR)
                .teacherId(null)
                .reason(null)
                .errors(List.copyOf(errors))
                .warnings(List.of())
                .build();
    }

    private void validateRequiredAndLength(
            String value,
            String label,
            int maxLength,
            String requiredMessage,
            List<String> errors
    ) {
        if (value == null) {
            if (requiredMessage != null) {
                errors.add(requiredMessage);
            }
            return;
        }
        if (value.length() > maxLength) {
            errors.add(label + " не длиннее " + maxLength + " символов");
        }
    }

    private String validateMaxLength(String value, String label, int maxLength, List<String> errors) {
        if (value != null && value.length() > maxLength) {
            errors.add(label + " не длиннее " + maxLength + " символов");
        }
        return value;
    }

    private TeacherDegree parseDegree(String raw, List<String> errors) {
        if (raw == null) {
            return null;
        }
        try {
            return TeacherDegree.valueOf(raw.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ignored) {
            // fallback to Russian alias lookup
        }
        TeacherDegree mapped = DEGREE_ALIASES.get(compactKey(raw));
        if (mapped == null) {
            errors.add("Неизвестная учёная степень: «" + raw + "»");
        }
        return mapped;
    }

    private TeacherRank parseRank(String raw, List<String> errors) {
        if (raw == null) {
            return null;
        }
        try {
            return TeacherRank.valueOf(raw.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ignored) {
            // fallback to Russian alias lookup
        }
        TeacherRank mapped = RANK_ALIASES.get(compactKey(raw));
        if (mapped == null) {
            errors.add("Неизвестное учёное звание: «" + raw + "»");
        }
        return mapped;
    }

    private String validateAndNormalizeEmail(String raw, List<String> errors) {
        if (raw == null) {
            return null;
        }
        if (raw.length() > EMAIL_MAX_LENGTH) {
            errors.add("Email не длиннее " + EMAIL_MAX_LENGTH + " символов");
            return null;
        }
        if (!isAscii(raw)) {
            errors.add("Email содержит недопустимые не-ASCII символы");
            return null;
        }
        String lower = raw.toLowerCase(Locale.ROOT);
        Set<ConstraintViolation<TeacherRequestDto>> violations =
                validator.validateValue(TeacherRequestDto.class, "email", lower);
        if (!violations.isEmpty()) {
            errors.add("Некорректный адрес почты: «" + raw + "»");
            return null;
        }
        return lower;
    }

    private String validatePhone(String raw, List<String> errors) {
        if (raw == null) {
            return null;
        }
        if (raw.length() > PHONE_MAX_LENGTH) {
            errors.add("Телефон не длиннее " + PHONE_MAX_LENGTH + " символов");
        }
        if (!PHONE_PATTERN.matcher(raw).matches()) {
            errors.add(PhoneRules.MESSAGE);
        }
        return raw;
    }

    private Integer validateExperience(Integer value, String label, List<String> errors) {
        if (value != null && value < 0) {
            errors.add(label + " не может быть отрицательным");
        }
        return value;
    }

    private String sanitizeRichText(String value) {
        if (value == null) {
            return null;
        }
        String cleaned = HtmlSanitizer.sanitize(value);
        return cleaned.isBlank() ? null : cleaned;
    }

    private static boolean isAscii(String value) {
        for (int i = 0; i < value.length(); i++) {
            char ch = value.charAt(i);
            if (ch < 0x20 || ch > 0x7E) {
                return false;
            }
        }
        return true;
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static String buildFullName(String lastName, String firstName, String patronymic) {
        StringBuilder sb = new StringBuilder();
        if (lastName != null) {
            sb.append(lastName);
        }
        if (firstName != null) {
            if (!sb.isEmpty()) {
                sb.append(' ');
            }
            sb.append(firstName);
        }
        if (patronymic != null) {
            if (!sb.isEmpty()) {
                sb.append(' ');
            }
            sb.append(patronymic);
        }
        return sb.toString();
    }

    private static String fullNameKey(String lastName, String firstName, String patronymic) {
        if (lastName == null || firstName == null) {
            return null;
        }
        return (lastName + "|" + firstName + "|" + Objects.requireNonNullElse(patronymic, ""))
                .toLowerCase(Locale.ROOT);
    }

    private static String compactKey(String raw) {
        String normalized = raw.toLowerCase(Locale.ROOT).replace('ё', 'е');
        return COMPACT_STRIP_PATTERN.matcher(normalized).replaceAll("");
    }

    private static Map<String, TeacherDegree> buildDegreeAliases() {
        Map<String, TeacherDegree> map = new HashMap<>();
        register(map, TeacherDegree.DOCTOR_TECH,
                "д-р техн. наук", "д.т.н.", "дтн", "доктор технических наук");
        register(map, TeacherDegree.CANDIDATE_TECH,
                "канд. техн. наук", "к.т.н.", "ктн", "кандидат технических наук");
        register(map, TeacherDegree.CANDIDATE_PED,
                "канд. пед. наук", "к.п.н.", "к.пед.н.", "кпн", "кандидат педагогических наук");
        register(map, TeacherDegree.DOCTOR_PHYS_MATH,
                "д-р физ.-мат. наук", "д-р физ-мат наук", "д.ф.-м.н.", "дфмн", "доктор физико-математических наук");
        register(map, TeacherDegree.CANDIDATE_PHYS_MATH,
                "канд. физ.-мат. наук", "канд. физ-мат наук", "к.ф.-м.н.", "кфмн", "кандидат физико-математических наук");
        register(map, TeacherDegree.DOCTOR_ECONOM,
                "д-р экон. наук", "д.э.н.", "дэн", "доктор экономических наук");
        register(map, TeacherDegree.CANDIDATE_ECONOM,
                "канд. экон. наук", "к.э.н.", "кэн", "кандидат экономических наук");
        return Map.copyOf(map);
    }

    private static Map<String, TeacherRank> buildRankAliases() {
        Map<String, TeacherRank> map = new HashMap<>();
        register(map, TeacherRank.READER, "доцент", "доц.");
        register(map, TeacherRank.PROFESSOR, "профессор", "проф.");
        return Map.copyOf(map);
    }

    private static <E> void register(Map<String, E> map, E target, String... aliases) {
        for (String alias : aliases) {
            map.put(compactKey(alias), target);
        }
    }
}
