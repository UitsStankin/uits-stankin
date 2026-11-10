package ru.stankin.uits.module.staff;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import ru.stankin.uits.AbstractIntegrationTest;
import ru.stankin.uits.TestRole;
import ru.stankin.uits.common.PageResponseDto;
import ru.stankin.uits.module.achievements.entity.Achievement;
import ru.stankin.uits.module.achievements.repository.AchievementRepository;
import ru.stankin.uits.module.gradesheets.entity.GradeSheet;
import ru.stankin.uits.module.gradesheets.repository.GradeSheetRepository;
import ru.stankin.uits.module.schedule.dto.ExamScheduleFilesResponseDto;
import ru.stankin.uits.module.schedule.dto.ExamScheduleResponseDto;
import ru.stankin.uits.module.schedule.dto.ScheduleResponseDto;
import ru.stankin.uits.module.schedule.entity.Exam;
import ru.stankin.uits.module.schedule.entity.ExamSchedule;
import ru.stankin.uits.module.schedule.entity.Schedule;
import ru.stankin.uits.module.schedule.entity.ScheduleLesson;
import ru.stankin.uits.module.schedule.entity.ScheduleLessonDate;
import ru.stankin.uits.module.schedule.repository.ExamScheduleRepository;
import ru.stankin.uits.module.schedule.repository.ScheduleRepository;
import ru.stankin.uits.module.staff.dto.TeacherDetailsResponseDto;
import ru.stankin.uits.module.staff.dto.TeacherRequestDto;
import ru.stankin.uits.module.staff.dto.TeacherResponseDto;
import ru.stankin.uits.module.staff.entity.Teacher;
import ru.stankin.uits.module.staff.repository.TeacherRepository;
import ru.stankin.uits.module.students.entity.Postgraduate;
import ru.stankin.uits.module.students.entity.Student;
import ru.stankin.uits.module.students.enums.EducationLevel;
import ru.stankin.uits.module.students.repository.PostgraduateRepository;
import ru.stankin.uits.module.students.repository.StudentRepository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class TeacherArchiveIntegrationTest extends AbstractIntegrationTest {

    private static final ParameterizedTypeReference<PageResponseDto<TeacherResponseDto>> TEACHER_PAGE =
            new ParameterizedTypeReference<>() {
            };

    private static final ParameterizedTypeReference<List<ExamScheduleResponseDto>> EXAMS_SUMMARY =
            new ParameterizedTypeReference<>() {
            };

    private static final long MISSING_ID = 999_999L;

    @Autowired
    private TeacherRepository teacherRepository;

    @Autowired
    private ScheduleRepository scheduleRepository;

    @Autowired
    private ExamScheduleRepository examScheduleRepository;

    @Autowired
    private AchievementRepository achievementRepository;

    @Autowired
    private PostgraduateRepository postgraduateRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private GradeSheetRepository gradeSheetRepository;

    private String token;

    @BeforeEach
    void logInModerator() {
        createUser("moder", TestRole.MODERATOR);
        token = login("moder");
    }

    @Test
    void archive_HidesTeacherFromPublicList() {
        Teacher stays = createCard("Абрамов", "Иван");
        Teacher leaves = createCard("Яковлев", "Пётр");

        assertThat(archive(leaves.getId()).getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        assertThat(publicTeacherIds()).containsExactly(stays.getId());
    }

    @Test
    void archive_KeepsCardOpenByDirectLink() {
        Teacher leaves = createCard("Яковлев", "Пётр");
        Teacher stays = createCard("Абрамов", "Иван");
        archive(leaves.getId());

        TeacherDetailsResponseDto archived = details(leaves.getId());
        TeacherDetailsResponseDto active = details(stays.getId());

        assertThat(archived.getLastName()).isEqualTo("Яковлев");
        assertThat(archived.isArchived()).isTrue();
        assertThat(active.isArchived()).isFalse();
    }

    @Test
    void getMyCard_WhenTeacherIsArchived_ReturnsArchivedFlagAndLoginStillWorks() {
        Teacher card = createCard("Иванова", "Мария");
        linkAccount(card, "teacher_user");
        archive(card.getId());

        TeacherDetailsResponseDto mine = myCard(login("teacher_user"));

        assertThat(mine.getLastName()).isEqualTo("Иванова");
        assertThat(mine.isArchived()).isTrue();
    }

    @Test
    void getMyCard_AfterUnarchive_ReturnsArchivedFalse() {
        Teacher card = createCard("Иванова", "Мария");
        linkAccount(card, "teacher_user");
        String teacherToken = login("teacher_user");
        archive(card.getId());
        unarchive(card.getId());

        assertThat(myCard(teacherToken).isArchived()).isFalse();
    }

    @Test
    void archive_Twice_KeepsFirstTimestamp() {
        Teacher leaves = createCard("Яковлев", "Пётр");

        assertThat(archive(leaves.getId()).getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        OffsetDateTime first = teacherRepository.findById(leaves.getId()).orElseThrow().getArchivedAt();

        assertThat(archive(leaves.getId()).getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        OffsetDateTime second = teacherRepository.findById(leaves.getId()).orElseThrow().getArchivedAt();

        assertThat(first).isNotNull();
        assertThat(second).isEqualTo(first);
    }

    @Test
    void archive_WhenTeacherIsMissing_Returns404() {
        assertThat(archive(MISSING_ID).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void unarchive_ReturnsTeacherToPublicList() {
        Teacher card = createCard("Яковлев", "Пётр");
        archive(card.getId());

        assertThat(unarchive(card.getId()).getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        assertThat(publicTeacherIds()).containsExactly(card.getId());
        assertThat(teacherRepository.findById(card.getId()).orElseThrow().getArchivedAt()).isNull();
    }

    @Test
    void unarchive_WhenNotArchived_Returns204() {
        Teacher card = createCard("Яковлев", "Пётр");

        assertThat(unarchive(card.getId()).getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(publicTeacherIds()).containsExactly(card.getId());
    }

    @Test
    void unarchive_WhenTeacherIsMissing_Returns404() {
        assertThat(unarchive(MISSING_ID).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void archive_HidesTeacherFromSummaries() {
        Teacher stays = createCard("Абрамов", "Иван");
        Teacher leaves = createCard("Яковлев", "Пётр");
        for (Teacher card : List.of(stays, leaves)) {
            card.setExamScheduleGraduation("https://stankin.ru/exams.pdf");
            teacherRepository.save(card);
            saveSchedule(card);
            saveExams(card);
        }

        archive(leaves.getId());

        assertThat(scheduleSummary("")).extracting(ScheduleResponseDto::getTeacherId)
                .containsExactly(stays.getId());
        assertThat(scheduleSummary("?teacherId=" + leaves.getId())).isEmpty();
        assertThat(examsSummary()).extracting(ExamScheduleResponseDto::getTeacherId)
                .containsExactly(stays.getId());
        assertThat(examFiles()).extracting(ExamScheduleFilesResponseDto::getTeacherId)
                .containsExactly(stays.getId());
    }

    @Test
    void archive_KeepsScheduleAndExamsReadableByDirectLink() {
        Teacher leaves = createCard("Яковлев", "Пётр");
        saveSchedule(leaves);
        saveExams(leaves);
        archive(leaves.getId());

        ResponseEntity<ScheduleResponseDto> schedule = restTemplate.getForEntity(
                "/api/public/teachers/" + leaves.getId() + "/schedule", ScheduleResponseDto.class);
        ResponseEntity<ExamScheduleResponseDto> exams = restTemplate.getForEntity(
                "/api/public/teachers/" + leaves.getId() + "/exams", ExamScheduleResponseDto.class);

        assertThat(schedule.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(schedule.getBody()).isNotNull();
        assertThat(schedule.getBody().getLessons()).hasSize(1);
        assertThat(exams.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(exams.getBody()).isNotNull();
        assertThat(exams.getBody().getExams()).hasSize(1);
    }

    @Test
    void archive_KeepsAchievementPostgraduateAndGradeSheetOwner() {
        Teacher card = createCard("Иванова", "Мария");
        Long achievementId = achievementRepository.save(Achievement.builder()
                .title("Победа в конкурсе")
                .description("Краткое описание")
                .content("<p>Подробности</p>")
                .previewImage("achievements/2026/09/a1.jpg")
                .teacher(card)
                .build()).getId();
        Student student = studentRepository.save(Student.builder()
                .lastName("Абрамов")
                .firstName("Пётр")
                .group("ИДМ-24-01")
                .educationLevel(EducationLevel.POSTGRADUATE)
                .admissionYear(2024)
                .build());
        Long postgraduateId = postgraduateRepository.save(Postgraduate.builder()
                .student(student)
                .teacher(card)
                .build()).getId();
        Long gradeSheetId = gradeSheetRepository.save(GradeSheet.builder()
                .disciplineName("Базы данных")
                .group("ИДБ-21-01")
                .semester("осенний 2026/2027")
                .teacher(card)
                .importedTeachers("Иванова М. П.")
                .importedAt(OffsetDateTime.now())
                .build()).getId();

        archive(card.getId());

        assertThat(achievementRepository.findById(achievementId)).get()
                .extracting(Achievement::getTeacher)
                .isNotNull();
        assertThat(postgraduateRepository.findById(postgraduateId)).get()
                .extracting(Postgraduate::getTeacher)
                .isNotNull();
        assertThat(gradeSheetRepository.findById(gradeSheetId)).get()
                .extracting(GradeSheet::getTeacher)
                .isNotNull();
    }

    @Test
    void updateTeacher_DoesNotUnarchive() {
        Teacher card = createCard("Иванова", "Мария");
        archive(card.getId());
        TeacherRequestDto request = TeacherRequestDto.builder()
                .lastName("Иванова-Петрова")
                .firstName("Мария")
                .position("профессор")
                .build();

        ResponseEntity<TeacherDetailsResponseDto> response = restTemplate.exchange(
                "/api/teachers/" + card.getId(),
                HttpMethod.PUT,
                new HttpEntity<>(request, authHeaders()),
                TeacherDetailsResponseDto.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getLastName()).isEqualTo("Иванова-Петрова");
        assertThat(response.getBody().isArchived()).isTrue();
        assertThat(teacherRepository.findById(card.getId()).orElseThrow().getArchivedAt()).isNotNull();
    }

    @Test
    void getTeachers_WithoutFilter_ReturnsActiveAndArchivedWithFlag() {
        createCard("Абрамов", "Иван");
        Teacher leaves = createCard("Яковлев", "Пётр");
        archive(leaves.getId());

        List<TeacherResponseDto> all = adminTeachers("");

        assertThat(all).extracting(TeacherResponseDto::getLastName).containsExactly("Абрамов", "Яковлев");
        assertThat(all).extracting(TeacherResponseDto::isArchived).containsExactly(false, true);
    }

    @Test
    void getTeachers_WithArchivedTrue_ReturnsOnlyArchived() {
        createCard("Абрамов", "Иван");
        Teacher leaves = createCard("Яковлев", "Пётр");
        archive(leaves.getId());

        assertThat(adminTeachers("?archived=true"))
                .extracting(TeacherResponseDto::getId)
                .containsExactly(leaves.getId());
    }

    @Test
    void getTeachers_WithArchivedFalse_ReturnsOnlyActive() {
        Teacher stays = createCard("Абрамов", "Иван");
        Teacher leaves = createCard("Яковлев", "Пётр");
        archive(leaves.getId());

        assertThat(adminTeachers("?archived=false"))
                .extracting(TeacherResponseDto::getId)
                .containsExactly(stays.getId());
    }

    @Test
    void getTeachers_WhenSortFieldIsUnknown_Returns400() {
        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/teachers?sort=abc",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders()),
                ProblemDetail.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    private Teacher createCard(String lastName, String firstName) {
        return teacherRepository.save(Teacher.builder()
                .lastName(lastName)
                .firstName(firstName)
                .position("доцент")
                .build());
    }

    private HttpHeaders authHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);

        return headers;
    }

    private ResponseEntity<Void> archive(Long id) {
        return post("/api/teachers/" + id + "/archive");
    }

    private ResponseEntity<Void> unarchive(Long id) {
        return post("/api/teachers/" + id + "/unarchive");
    }

    private ResponseEntity<Void> post(String path) {
        return restTemplate.exchange(path, HttpMethod.POST, new HttpEntity<>(authHeaders()), Void.class);
    }

    private TeacherDetailsResponseDto details(Long id) {
        ResponseEntity<TeacherDetailsResponseDto> response = restTemplate.getForEntity(
                "/api/public/teachers/" + id, TeacherDetailsResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();

        return response.getBody();
    }

    private void linkAccount(Teacher card, String username) {
        card.setUser(createUser(username, TestRole.TEACHER));
        teacherRepository.save(card);
    }

    private TeacherDetailsResponseDto myCard(String teacherToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(teacherToken);

        ResponseEntity<TeacherDetailsResponseDto> response = restTemplate.exchange(
                "/api/teachers/me", HttpMethod.GET, new HttpEntity<>(headers), TeacherDetailsResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();

        return response.getBody();
    }

    private List<Long> publicTeacherIds() {
        ResponseEntity<PageResponseDto<TeacherResponseDto>> response = restTemplate.exchange(
                "/api/public/teachers", HttpMethod.GET, null, TEACHER_PAGE);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();

        return response.getBody().content().stream().map(TeacherResponseDto::getId).toList();
    }

    private List<TeacherResponseDto> adminTeachers(String query) {
        ResponseEntity<PageResponseDto<TeacherResponseDto>> response = restTemplate.exchange(
                "/api/teachers" + query, HttpMethod.GET, new HttpEntity<>(authHeaders()), TEACHER_PAGE);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();

        return response.getBody().content();
    }

    private ScheduleResponseDto[] scheduleSummary(String query) {
        ResponseEntity<ScheduleResponseDto[]> response =
                restTemplate.getForEntity("/api/public/schedule" + query, ScheduleResponseDto[].class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();

        return response.getBody();
    }

    private List<ExamScheduleResponseDto> examsSummary() {
        ResponseEntity<List<ExamScheduleResponseDto>> response =
                restTemplate.exchange("/api/public/exams", HttpMethod.GET, null, EXAMS_SUMMARY);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();

        return response.getBody();
    }

    private List<ExamScheduleFilesResponseDto> examFiles() {
        ResponseEntity<ExamScheduleFilesResponseDto[]> response = restTemplate.getForEntity(
                "/api/public/exams/files", ExamScheduleFilesResponseDto[].class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();

        return List.of(response.getBody());
    }

    private void saveSchedule(Teacher teacher) {
        Schedule schedule = Schedule.builder()
                .teacher(teacher)
                .importedFileName("schedule.pdf")
                .build();
        ScheduleLesson lesson = ScheduleLesson.builder()
                .weekNumber(1)
                .classTime(1)
                .group("ИДБ-25-11")
                .name("Базы данных")
                .type("Лекция")
                .cabinet("216")
                .build();
        lesson.addDate(ScheduleLessonDate.builder()
                .startDate("16.03")
                .endDate("27.04")
                .alternativelyPeriod(false)
                .build());
        schedule.addLesson(lesson);
        scheduleRepository.save(schedule);
    }

    private void saveExams(Teacher teacher) {
        ExamSchedule exams = ExamSchedule.builder().teacher(teacher).build();
        exams.addExam(Exam.builder()
                .examDate(LocalDate.parse("2025-05-21"))
                .timeStart(LocalTime.of(8, 30))
                .timeEnd(LocalTime.of(14, 0))
                .group("ИДБ-21-09")
                .name("Базы данных")
                .cabinet("308")
                .build());
        examScheduleRepository.save(exams);
    }
}
