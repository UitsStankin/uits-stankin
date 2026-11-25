package ru.stankin.uits.module.staff;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import ru.stankin.uits.AbstractIntegrationTest;
import ru.stankin.uits.TestRole;
import ru.stankin.uits.common.exception.ScheduleServiceUnavailableException;
import ru.stankin.uits.module.staff.client.StaffImportParseClient;
import ru.stankin.uits.module.staff.dto.ParsedStaffFileDto;
import ru.stankin.uits.module.staff.dto.ParsedStaffRowDto;
import ru.stankin.uits.module.staff.dto.TeacherImportAction;
import ru.stankin.uits.module.staff.dto.TeacherImportItemDto;
import ru.stankin.uits.module.staff.dto.TeacherImportResponseDto;
import ru.stankin.uits.module.staff.entity.Subject;
import ru.stankin.uits.module.staff.entity.Teacher;
import ru.stankin.uits.module.staff.enums.TeacherDegree;
import ru.stankin.uits.module.staff.enums.TeacherRank;
import ru.stankin.uits.module.staff.repository.SubjectRepository;
import ru.stankin.uits.module.staff.repository.TeacherRepository;
import ru.stankin.uits.module.user.entity.User;

import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verifyNoInteractions;

class TeacherImportIntegrationTest extends AbstractIntegrationTest {

    @MockitoBean
    private StaffImportParseClient staffImportParseClient;

    @Autowired
    private TeacherRepository teacherRepository;

    @Autowired
    private SubjectRepository subjectRepository;

    @Autowired
    private TransactionTemplate transactionTemplate;

    private String moderatorToken;

    @BeforeEach
    void setUp() {
        createUser("staff-import-mod", TestRole.MODERATOR);
        moderatorToken = login("staff-import-mod");
    }

    private HttpEntity<MultiValueMap<String, Object>> multipartRequest(String filename, byte[] content) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        headers.setBearerAuth(moderatorToken);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", new ByteArrayResource(content) {
            @Override
            public String getFilename() {
                return filename;
            }
        });

        return new HttpEntity<>(body, headers);
    }

    private ParsedStaffRowDto validRow(int rowNumber, String lastName, String firstName, String email) {
        return ParsedStaffRowDto.builder()
                .rowNumber(rowNumber)
                .category("ППС")
                .lastName(lastName)
                .firstName(firstName)
                .patronymic("Тестович")
                .position("доцент")
                .degree("канд. техн. наук")
                .rank("доцент")
                .email(email)
                .parseErrors(List.of())
                .build();
    }

    @Test
    void import_DryRunTrue_ReturnsPreviewWithoutDatabaseMutations() {
        given(staffImportParseClient.parse(any(), any())).willReturn(ParsedStaffFileDto.builder()
                .rows(List.of(
                        validRow(2, "Тестов", "Иван", "I.Testov@stankin.ru"),
                        ParsedStaffRowDto.builder()
                                .rowNumber(3)
                                .category("УВП")
                                .lastName("Помощников")
                                .firstName("Пётр")
                                .position("методист")
                                .email("p.pomoshnikov\u0430@stankin.ru") // Cyrillic 'а' ignored for pure UVP skip
                                .parseErrors(List.of())
                                .build()
                ))
                .warnings(List.of())
                .build());

        ResponseEntity<TeacherImportResponseDto> response = restTemplate.exchange(
                "/api/teachers/import?dryRun=true",
                HttpMethod.POST,
                multipartRequest("staff.xlsx", "PK".getBytes(StandardCharsets.UTF_8)),
                TeacherImportResponseDto.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        TeacherImportResponseDto body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.isDryRun()).isTrue();
        assertThat(body.getTotalRows()).isEqualTo(2);
        assertThat(body.getCreated()).isEqualTo(1);
        assertThat(body.getSkipped()).isEqualTo(1);
        assertThat(body.getFailed()).isEqualTo(0);
        assertThat(body.getItems().get(0).getAction()).isEqualTo(TeacherImportAction.CREATE);
        assertThat(body.getItems().get(0).getTeacherId()).isNull();
        assertThat(body.getItems().get(1).getAction()).isEqualTo(TeacherImportAction.SKIP);
        assertThat(body.getItems().get(1).getReason()).isEqualTo("Категория «УВП» не относится к ППС");
        assertThat(teacherRepository.count()).isZero();
    }

    @Test
    void import_CallsParsingClientOutsideTransaction() {
        AtomicBoolean txActiveDuringParse = new AtomicBoolean(true);
        given(staffImportParseClient.parse(any(), any())).willAnswer(invocation -> {
            txActiveDuringParse.set(TransactionSynchronizationManager.isActualTransactionActive());
            return ParsedStaffFileDto.builder()
                    .rows(List.of(validRow(2, "Внетранзакционный", "Олег", "o.tx@stankin.ru")))
                    .warnings(List.of())
                    .build();
        });

        ResponseEntity<TeacherImportResponseDto> response = restTemplate.exchange(
                "/api/teachers/import",
                HttpMethod.POST,
                multipartRequest("staff.csv", "ФИО;Должность\n".getBytes(StandardCharsets.UTF_8)),
                TeacherImportResponseDto.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(txActiveDuringParse.get()).isFalse();
        assertThat(teacherRepository.count()).isEqualTo(1);
    }

    @Test
    void import_CombinedCategoriesAndAllDegreeRankAliasesAndSanitizerWork() {
        given(staffImportParseClient.parse(any(), any())).willReturn(ParsedStaffFileDto.builder()
                .rows(List.of(
                        ParsedStaffRowDto.builder()
                                .rowNumber(2)
                                .category("ППС, УВП")
                                .lastName("Совместитель")
                                .firstName("Игорь")
                                .position("ст. преподаватель")
                                .degree("канд. пед. наук")
                                .rank("READER")
                                .email("I.Sovmest@stankin.ru")
                                .education("<p>МГТУ</p><script>alert(1)</script>")
                                .qualification("<img src=x onerror=alert(1)>Курс")
                                .bio("<b>plain</b>")
                                .parseErrors(List.of())
                                .build(),
                        ParsedStaffRowDto.builder()
                                .rowNumber(3)
                                .category("УВП, ППС")
                                .lastName("Докторова")
                                .firstName("Елена")
                                .position("профессор")
                                .degree("д-р физ.-мат. наук")
                                .rank("профессор")
                                .email("e.doktorova@stankin.ru")
                                .parseErrors(List.of())
                                .build(),
                        ParsedStaffRowDto.builder()
                                .rowNumber(4)
                                .category(null)
                                .lastName("Экономистов")
                                .firstName("Сергей")
                                .position("профессор")
                                .degree("д-р экон. наук")
                                .parseErrors(List.of())
                                .build()
                ))
                .warnings(List.of())
                .build());

        ResponseEntity<TeacherImportResponseDto> response = restTemplate.exchange(
                "/api/teachers/import",
                HttpMethod.POST,
                multipartRequest("staff.xlsx", "PK".getBytes(StandardCharsets.UTF_8)),
                TeacherImportResponseDto.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getCreated()).isEqualTo(3);

        List<Teacher> saved = teacherRepository.findByArchivedAtIsNullOrderByIdAsc();
        assertThat(saved).hasSize(3);

        Teacher first = saved.get(0);
        assertThat(first.getDegree()).isEqualTo(TeacherDegree.CANDIDATE_PED);
        assertThat(first.getRank()).isEqualTo(TeacherRank.READER);
        assertThat(first.getEmail()).isEqualTo("i.sovmest@stankin.ru");
        assertThat(first.getEducation()).isEqualTo("<p>МГТУ</p>");
        assertThat(first.getQualification()).doesNotContain("onerror").contains("Курс");
        assertThat(first.getBio()).isEqualTo("<b>plain</b>");

        Teacher second = saved.get(1);
        assertThat(second.getDegree()).isEqualTo(TeacherDegree.DOCTOR_PHYS_MATH);
        assertThat(second.getRank()).isEqualTo(TeacherRank.PROFESSOR);

        Teacher third = saved.get(2);
        assertThat(third.getDegree()).isEqualTo(TeacherDegree.DOCTOR_ECONOM);
        assertThat(third.getEmail()).isNull();
    }

    @Test
    void import_PartialImport_RejectsBadRowsAndInFileDuplicatesWhileSavingValidRows() {
        given(staffImportParseClient.parse(any(), any())).willReturn(ParsedStaffFileDto.builder()
                .rows(List.of(
                        validRow(2, "Валидный", "Алексей", "a.valid@stankin.ru"),
                        ParsedStaffRowDto.builder()
                                .rowNumber(3)
                                .category("ППС")
                                .lastName("Неаски")
                                .firstName("Мария")
                                .position("доцент")
                                .email("m.bad\u0430@stankin.ru")
                                .parseErrors(List.of())
                                .build(),
                        ParsedStaffRowDto.builder()
                                .rowNumber(4)
                                .category("ППС")
                                .lastName("Степенев")
                                .firstName("Иван")
                                .position("доцент")
                                .degree("кандидат магии")
                                .rank("академик")
                                .phoneNumber("bad$phone")
                                .experience(-5)
                                .parseErrors(List.of("Поле «стаж по специальности» («abc») не является целым числом"))
                                .build(),
                        validRow(5, "ДубльПочты", "Ольга", "A.VALID@stankin.ru"),
                        validRow(6, "Валидный", "Алексей", "other@stankin.ru")
                ))
                .warnings(List.of())
                .build());

        ResponseEntity<TeacherImportResponseDto> response = restTemplate.exchange(
                "/api/teachers/import",
                HttpMethod.POST,
                multipartRequest("staff.xlsx", "PK".getBytes(StandardCharsets.UTF_8)),
                TeacherImportResponseDto.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        TeacherImportResponseDto body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.getTotalRows()).isEqualTo(5);
        assertThat(body.getCreated()).isEqualTo(1);
        assertThat(body.getFailed()).isEqualTo(4);

        List<TeacherImportItemDto> items = body.getItems();
        assertThat(items.get(0).getAction()).isEqualTo(TeacherImportAction.CREATE);
        assertThat(items.get(1).getAction()).isEqualTo(TeacherImportAction.ERROR);
        assertThat(items.get(1).getErrors()).anyMatch(e -> e.contains("не-ASCII"));
        assertThat(items.get(2).getAction()).isEqualTo(TeacherImportAction.ERROR);
        assertThat(items.get(2).getErrors()).hasSize(5);
        assertThat(items.get(3).getAction()).isEqualTo(TeacherImportAction.ERROR);
        assertThat(items.get(3).getErrors()).containsExactly("Дубликат записи из строки 2");
        assertThat(items.get(4).getAction()).isEqualTo(TeacherImportAction.ERROR);
        assertThat(items.get(4).getErrors()).containsExactly("Дубликат записи из строки 2");

        assertThat(teacherRepository.count()).isEqualTo(1);
    }

    @Test
    void import_OnDuplicateSkipAndUpdate_RespectNonArchivedAndPreserveLinkedFields() {
        User linkedUser = createUser("linked-teacher", TestRole.TEACHER);
        Subject subj = subjectRepository.save(Subject.builder().name("Алгоритмы").build());

        Teacher existing = teacherRepository.save(Teacher.builder()
                .lastName("Существующий")
                .firstName("Дмитрий")
                .patronymic("Сергеевич")
                .position("преподаватель")
                .email("d.existing@stankin.ru")
                .phoneNumber("+7 (499) 111-22-33")
                .avatar("avatars/keep-me.jpg")
                .examScheduleGraduation("https://stankin.ru/grad.pdf")
                .examScheduleNonGraduation("https://stankin.ru/nongrad.pdf")
                .user(linkedUser)
                .subjects(Set.of(subj))
                .build());

        // Archived teacher with same email as row 3 must NOT block creating new active card
        teacherRepository.save(Teacher.builder()
                .lastName("Архивный")
                .firstName("Павел")
                .position("доцент")
                .email("p.archived@stankin.ru")
                .archivedAt(OffsetDateTime.now(ZoneOffset.UTC))
                .build());

        given(staffImportParseClient.parse(any(), any())).willReturn(ParsedStaffFileDto.builder()
                .rows(List.of(
                        ParsedStaffRowDto.builder()
                                .rowNumber(2)
                                .category("ППС")
                                .lastName("Существующий")
                                .firstName("Дмитрий")
                                .patronymic("Сергеевич")
                                .position("доцент")
                                .degree("д-р техн. наук")
                                .email("D.EXISTING@stankin.ru")
                                .phoneNumber(null) // empty in file -> must NOT overwrite existing phone!
                                .parseErrors(List.of())
                                .build(),
                        validRow(3, "Архивный", "Павел", "p.archived@stankin.ru")
                ))
                .warnings(List.of())
                .build());

        // 1. onDuplicate=SKIP
        ResponseEntity<TeacherImportResponseDto> skipResp = restTemplate.exchange(
                "/api/teachers/import?dryRun=true&onDuplicate=SKIP",
                HttpMethod.POST,
                multipartRequest("staff.xlsx", "PK".getBytes(StandardCharsets.UTF_8)),
                TeacherImportResponseDto.class
        );
        assertThat(skipResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(skipResp.getBody().getSkipped()).isEqualTo(1);
        assertThat(skipResp.getBody().getCreated()).isEqualTo(1);
        assertThat(skipResp.getBody().getItems().get(0).getTeacherId()).isEqualTo(existing.getId());
        assertThat(skipResp.getBody().getItems().get(0).getReason()).isEqualTo("Карточка уже существует");

        // 2. onDuplicate=UPDATE
        ResponseEntity<TeacherImportResponseDto> updateResp = restTemplate.exchange(
                "/api/teachers/import?dryRun=false&onDuplicate=UPDATE",
                HttpMethod.POST,
                multipartRequest("staff.xlsx", "PK".getBytes(StandardCharsets.UTF_8)),
                TeacherImportResponseDto.class
        );
        assertThat(updateResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(updateResp.getBody().getUpdated()).isEqualTo(1);
        assertThat(updateResp.getBody().getCreated()).isEqualTo(1);

        transactionTemplate.executeWithoutResult(status -> {
            Teacher updated = teacherRepository.findById(existing.getId()).orElseThrow();
            assertThat(updated.getPosition()).isEqualTo("доцент");
            assertThat(updated.getDegree()).isEqualTo(TeacherDegree.DOCTOR_TECH);
            assertThat(updated.getPhoneNumber()).isEqualTo("+7 (499) 111-22-33");
            assertThat(updated.getAvatar()).isEqualTo("avatars/keep-me.jpg");
            assertThat(updated.getExamScheduleGraduation()).isEqualTo("https://stankin.ru/grad.pdf");
            assertThat(updated.getExamScheduleNonGraduation()).isEqualTo("https://stankin.ru/nongrad.pdf");
            assertThat(updated.getUser().getId()).isEqualTo(linkedUser.getId());
            assertThat(updated.getSubjects()).extracting(Subject::getName).containsExactly("Алгоритмы");
        });
    }

    @Test
    void import_BadExtensionOrEmptyFileReturns400WithoutCallingClient() {
        ResponseEntity<ProblemDetail> badExt = restTemplate.exchange(
                "/api/teachers/import",
                HttpMethod.POST,
                multipartRequest("staff.txt", "hello".getBytes(StandardCharsets.UTF_8)),
                ProblemDetail.class
        );
        assertThat(badExt.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);

        ResponseEntity<ProblemDetail> empty = restTemplate.exchange(
                "/api/teachers/import",
                HttpMethod.POST,
                multipartRequest("staff.csv", new byte[0]),
                ProblemDetail.class
        );
        assertThat(empty.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        verifyNoInteractions(staffImportParseClient);
    }

    @Test
    void import_WhenParsingServiceUnavailable_Returns503() {
        given(staffImportParseClient.parse(any(), any()))
                .willThrow(new ScheduleServiceUnavailableException("Сервис разбора списка сотрудников не отвечает."));

        ResponseEntity<ProblemDetail> resp = restTemplate.exchange(
                "/api/teachers/import",
                HttpMethod.POST,
                multipartRequest("staff.xlsx", "PK".getBytes(StandardCharsets.UTF_8)),
                ProblemDetail.class
        );

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
    }
}
