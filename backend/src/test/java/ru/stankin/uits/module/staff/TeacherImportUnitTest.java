package ru.stankin.uits.module.staff;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import ru.stankin.uits.common.exception.InvalidFileException;
import ru.stankin.uits.module.staff.client.StaffImportParseClient;
import ru.stankin.uits.module.staff.dto.DuplicateStrategy;
import ru.stankin.uits.module.staff.dto.ParsedStaffFileDto;
import ru.stankin.uits.module.staff.dto.ParsedStaffRowDto;
import ru.stankin.uits.module.staff.dto.TeacherImportAction;
import ru.stankin.uits.module.staff.dto.TeacherImportResponseDto;
import ru.stankin.uits.module.staff.entity.Subject;
import ru.stankin.uits.module.staff.entity.Teacher;
import ru.stankin.uits.module.staff.enums.TeacherDegree;
import ru.stankin.uits.module.staff.enums.TeacherRank;
import ru.stankin.uits.module.staff.repository.TeacherRepository;
import ru.stankin.uits.module.staff.service.TeacherImportProcessor;
import ru.stankin.uits.module.staff.service.TeacherImportService;
import ru.stankin.uits.module.user.entity.User;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Set;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class TeacherImportUnitTest {

    @Mock
    private StaffImportParseClient staffImportParseClient;

    @Mock
    private TeacherRepository teacherRepository;

    private TeacherImportProcessor processor;
    private TeacherImportService service;

    @BeforeEach
    void setUp() {
        Validator validator = Validation.buildDefaultValidatorFactory().getValidator();
        processor = new TeacherImportProcessor(teacherRepository, validator);
        service = new TeacherImportService(staffImportParseClient, processor);
    }

    @Test
    void service_RejectsEmptyOversizedAndUnsupportedFilesBeforeClientCall() {
        MockMultipartFile empty = new MockMultipartFile("file", "staff.csv", "text/csv", new byte[0]);
        assertThatThrownBy(() -> service.importFromFile(empty, false, DuplicateStrategy.SKIP))
                .isInstanceOf(InvalidFileException.class);

        MockMultipartFile badExt = new MockMultipartFile(
                "file", "staff.pdf", "application/pdf", "pdf".getBytes(StandardCharsets.UTF_8));
        assertThatThrownBy(() -> service.importFromFile(badExt, false, DuplicateStrategy.SKIP))
                .isInstanceOf(InvalidFileException.class);

        MockMultipartFile tooBig = new MockMultipartFile(
                "file", "staff.xlsx", "application/octet-stream", new byte[5 * 1024 * 1024 + 1]);
        assertThatThrownBy(() -> service.importFromFile(tooBig, false, DuplicateStrategy.SKIP))
                .isInstanceOf(InvalidFileException.class);

        verifyNoInteractions(staffImportParseClient);
    }

    @Test
    void service_RejectsEmptyParsedRows() {
        MockMultipartFile csv = new MockMultipartFile(
                "file", "staff.csv", "text/csv", "ФИО;Должность\n".getBytes(StandardCharsets.UTF_8));
        given(staffImportParseClient.parse(any(), any()))
                .willReturn(ParsedStaffFileDto.builder().rows(List.of()).warnings(List.of()).build());

        assertThatThrownBy(() -> service.importFromFile(csv, true, null))
                .isInstanceOf(InvalidFileException.class)
                .hasMessageContaining("нет ни одной строки");
    }

    @Test
    void processor_MapsAllDegreeAndRankAliasesAndSanitizesHtml() {
        given(teacherRepository.findByArchivedAtIsNullOrderByIdAsc()).willReturn(List.of());
        AtomicLong seq = new AtomicLong(100);
        given(teacherRepository.save(any(Teacher.class))).willAnswer(inv -> {
            Teacher t = inv.getArgument(0);
            t.setId(seq.incrementAndGet());
            return t;
        });

        List<ParsedStaffRowDto> rows = List.of(
                row(2, "ППС", "Алиасов", "Пётр", "доцент", "д-р техн. наук", "профессор", "P.Aliasov@stankin.ru"),
                row(3, "ППС, УВП", "Техников", "Иван", "доцент", "канд. техн. наук", "доцент", "i.teh@stankin.ru"),
                row(4, "УВП, ППС", "Педагогов", "Олег", "ст. преп.", "канд. пед. наук", null, "o.ped@stankin.ru"),
                row(5, null, "Физиков", "Антон", "профессор", "д-р физ.-мат. наук", "PROFESSOR", "a.phys@stankin.ru"),
                row(6, "ППС", "Математиков", "Сергей", "доцент", "канд. физ.-мат. наук", "READER", "s.math@stankin.ru"),
                row(7, "ППС", "Экономистов", "Дмитрий", "профессор", "д-р экон. наук", null, "d.econ@stankin.ru"),
                row(8, "ППС", "Кандидатов", "Алексей", "доцент", "канд. экон. наук", null, "a.cand@stankin.ru")
        );
        rows.getFirst().setEducation("<p>МГТУ</p><script>evil()</script>");
        rows.getFirst().setQualification("<a href=\"javascript:evil()\">Курс</a>");

        TeacherImportResponseDto result = processor.apply(rows, DuplicateStrategy.SKIP);

        assertThat(result.getCreated()).isEqualTo(7);
        assertThat(result.getFailed()).isZero();
        assertThat(result.getItems()).allMatch(i -> i.getAction() == TeacherImportAction.CREATE && i.getTeacherId() != null);
    }

    @Test
    void processor_DryRunDoesNotSaveAndUpdatePreservesLinkedEntities() {
        User user = User.builder().id(55L).username("t_user").build();
        Subject subject = Subject.builder().id(7L).name("Математика").build();
        Teacher existing = Teacher.builder()
                .id(42L)
                .lastName("Существующий")
                .firstName("Иван")
                .patronymic("Иванович")
                .position("преподаватель")
                .email("i.existing@stankin.ru")
                .phoneNumber("+7 499 000 00 00")
                .avatar("avatars/keep.jpg")
                .examScheduleGraduation("https://stankin.ru/g.pdf")
                .user(user)
                .subjects(Set.of(subject))
                .build();
        given(teacherRepository.findByArchivedAtIsNullOrderByIdAsc()).willReturn(List.of(existing));

        ParsedStaffRowDto updateRow = row(
                2, "ППС", "Существующий", "Иван", "доцент", "канд. техн. наук", "доцент", "I.EXISTING@stankin.ru");
        updateRow.setPatronymic("Иванович");
        updateRow.setPhoneNumber(null);

        TeacherImportResponseDto preview = processor.preview(List.of(updateRow), DuplicateStrategy.UPDATE);
        assertThat(preview.isDryRun()).isTrue();
        assertThat(preview.getUpdated()).isEqualTo(1);
        assertThat(preview.getItems().getFirst().getTeacherId()).isEqualTo(42L);
        assertThat(existing.getPosition()).isEqualTo("преподаватель"); // dryRun must NOT mutate entity!
        verify(teacherRepository, never()).save(any());

        TeacherImportResponseDto applied = processor.apply(List.of(updateRow), DuplicateStrategy.UPDATE);
        assertThat(applied.isDryRun()).isFalse();
        assertThat(applied.getUpdated()).isEqualTo(1);
        assertThat(existing.getPosition()).isEqualTo("доцент");
        assertThat(existing.getDegree()).isEqualTo(TeacherDegree.CANDIDATE_TECH);
        assertThat(existing.getRank()).isEqualTo(TeacherRank.READER);
        assertThat(existing.getPhoneNumber()).isEqualTo("+7 499 000 00 00");
        assertThat(existing.getAvatar()).isEqualTo("avatars/keep.jpg");
        assertThat(existing.getExamScheduleGraduation()).isEqualTo("https://stankin.ru/g.pdf");
        assertThat(existing.getUser()).isSameAs(user);
        assertThat(existing.getSubjects()).containsExactly(subject);
        verify(teacherRepository).save(existing);
    }

    @Test
    void processor_ValidatesAllErrorPathsAndPartialImport() {
        given(teacherRepository.findByArchivedAtIsNullOrderByIdAsc()).willReturn(List.of());
        given(teacherRepository.save(any(Teacher.class))).willAnswer(inv -> {
            Teacher t = inv.getArgument(0);
            t.setId(1L);
            return t;
        });

        ParsedStaffRowDto badNonAsciiEmail = row(2, "ППС", "Иванов", "Иван", "доцент", null, null, "i.ivanov\u0430@stankin.ru");
        ParsedStaffRowDto pureUvpWithBadEmail = row(3, "УВП", "Методистов", "Илья", "методист", null, null, "bad\u0430@stankin.ru");
        ParsedStaffRowDto missingRequired = ParsedStaffRowDto.builder().rowNumber(4).category("ППС").build();
        ParsedStaffRowDto tooLongAndInvalid = ParsedStaffRowDto.builder()
                .rowNumber(5)
                .category("ППС")
                .lastName("А".repeat(151))
                .firstName("Иван")
                .position("доцент")
                .degree("неизвестно")
                .rank("неизвестно")
                .phoneNumber("bad$phone")
                .experience(-1)
                .professionalExperience(-2)
                .parseErrors(List.of("ошибка парсера"))
                .build();
        ParsedStaffRowDto valid = row(6, "ППС", "Валидный", "Олег", "доцент", null, null, "o.valid@stankin.ru");
        ParsedStaffRowDto duplicateEmail = row(7, "ППС", "Другой", "Пётр", "доцент", null, null, "O.VALID@stankin.ru");

        TeacherImportResponseDto result = processor.apply(
                List.of(badNonAsciiEmail, pureUvpWithBadEmail, missingRequired, tooLongAndInvalid, valid, duplicateEmail),
                DuplicateStrategy.SKIP
        );

        assertThat(result.getTotalRows()).isEqualTo(6);
        assertThat(result.getCreated()).isEqualTo(1);
        assertThat(result.getSkipped()).isEqualTo(1);
        assertThat(result.getFailed()).isEqualTo(4);
        assertThat(result.getItems().get(0).getErrors()).anyMatch(e -> e.contains("не-ASCII"));
        assertThat(result.getItems().get(1).getAction()).isEqualTo(TeacherImportAction.SKIP);
        assertThat(result.getItems().get(2).getErrors()).containsExactlyInAnyOrder(
                "Фамилия обязательна", "Имя обязательно", "Должность обязательна");
        assertThat(result.getItems().get(3).getErrors()).hasSize(7);
        assertThat(result.getItems().get(4).getAction()).isEqualTo(TeacherImportAction.CREATE);
        assertThat(result.getItems().get(5).getErrors()).containsExactly("Дубликат записи из строки 6");
    }

    @Test
    void processor_OversizedAsciiEmailEmitsSingleLengthError() {
        given(teacherRepository.findByArchivedAtIsNullOrderByIdAsc()).willReturn(List.of());

        String oversizedEmail = "a".repeat(245) + "@stankin.ru";
        assertThat(oversizedEmail.length()).isGreaterThan(254);

        ParsedStaffRowDto row = row(2, "ППС", "Длинный", "Иван", "доцент", null, null, oversizedEmail);
        TeacherImportResponseDto result = processor.preview(List.of(row), DuplicateStrategy.SKIP);

        assertThat(result.getFailed()).isEqualTo(1);
        assertThat(result.getItems().getFirst().getErrors())
                .containsExactly("Email не длиннее 254 символов");
    }

    @Test
    void processor_OnDuplicateUpdateRefreshesLookupKeysInBothDryRunAndApply() {
        Teacher emailChanged = Teacher.builder()
                .id(10L)
                .lastName("Иванов")
                .firstName("Иван")
                .patronymic("Тестович")
                .position("преподаватель")
                .email("old@stankin.ru")
                .build();
        Teacher nameChanged = Teacher.builder()
                .id(11L)
                .lastName("Старова")
                .firstName("Анна")
                .patronymic("Тестович")
                .position("преподаватель")
                .email("anna@stankin.ru")
                .build();
        given(teacherRepository.findByArchivedAtIsNullOrderByIdAsc()).willReturn(List.of(emailChanged, nameChanged));
        AtomicLong seq = new AtomicLong(100);
        given(teacherRepository.save(any(Teacher.class))).willAnswer(inv -> {
            Teacher t = inv.getArgument(0);
            if (t.getId() == null) {
                t.setId(seq.incrementAndGet());
            }
            return t;
        });

        List<ParsedStaffRowDto> rows = List.of(
                row(2, "ППС", "Иванов", "Иван", "доцент", null, null, "new@stankin.ru"),
                row(3, "ППС", "Петров", "Пётр", "доцент", null, null, "old@stankin.ru"),
                row(4, "ППС", "Нова", "Анна", "доцент", null, null, "anna@stankin.ru"),
                row(5, "ППС", "Старова", "Анна", "доцент", null, null, "other@stankin.ru")
        );

        TeacherImportResponseDto preview = processor.preview(rows, DuplicateStrategy.UPDATE);
        assertThat(preview.getUpdated()).isEqualTo(2);
        assertThat(preview.getCreated()).isEqualTo(2);
        assertThat(preview.getItems().get(0).getAction()).isEqualTo(TeacherImportAction.UPDATE);
        assertThat(preview.getItems().get(0).getTeacherId()).isEqualTo(10L);
        assertThat(preview.getItems().get(1).getAction()).isEqualTo(TeacherImportAction.CREATE);
        assertThat(preview.getItems().get(2).getAction()).isEqualTo(TeacherImportAction.UPDATE);
        assertThat(preview.getItems().get(2).getTeacherId()).isEqualTo(11L);
        assertThat(preview.getItems().get(3).getAction()).isEqualTo(TeacherImportAction.CREATE);
        assertThat(emailChanged.getEmail()).isEqualTo("old@stankin.ru");
        assertThat(nameChanged.getLastName()).isEqualTo("Старова");
        verify(teacherRepository, never()).save(any());

        TeacherImportResponseDto applied = processor.apply(rows, DuplicateStrategy.UPDATE);
        assertThat(applied.getUpdated()).isEqualTo(2);
        assertThat(applied.getCreated()).isEqualTo(2);
        assertThat(applied.getItems().get(0).getAction()).isEqualTo(TeacherImportAction.UPDATE);
        assertThat(applied.getItems().get(0).getTeacherId()).isEqualTo(10L);
        assertThat(applied.getItems().get(1).getAction()).isEqualTo(TeacherImportAction.CREATE);
        assertThat(applied.getItems().get(2).getAction()).isEqualTo(TeacherImportAction.UPDATE);
        assertThat(applied.getItems().get(2).getTeacherId()).isEqualTo(11L);
        assertThat(applied.getItems().get(3).getAction()).isEqualTo(TeacherImportAction.CREATE);
        assertThat(emailChanged.getEmail()).isEqualTo("new@stankin.ru");
        assertThat(nameChanged.getLastName()).isEqualTo("Нова");
    }

    private ParsedStaffRowDto row(
            int rowNumber,
            String category,
            String lastName,
            String firstName,
            String position,
            String degree,
            String rank,
            String email
    ) {
        return ParsedStaffRowDto.builder()
                .rowNumber(rowNumber)
                .category(category)
                .lastName(lastName)
                .firstName(firstName)
                .patronymic("Тестович")
                .position(position)
                .degree(degree)
                .rank(rank)
                .email(email)
                .parseErrors(List.of())
                .build();
    }
}
