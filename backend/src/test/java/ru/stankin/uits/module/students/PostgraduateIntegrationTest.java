package ru.stankin.uits.module.students;

import jakarta.persistence.EntityManagerFactory;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
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
import ru.stankin.uits.module.staff.entity.Teacher;
import ru.stankin.uits.module.staff.repository.TeacherRepository;
import ru.stankin.uits.module.students.dto.PostgraduateDetailsResponseDto;
import ru.stankin.uits.module.students.dto.PostgraduateRequestDto;
import ru.stankin.uits.module.students.dto.PostgraduateResponseDto;
import ru.stankin.uits.module.students.dto.StudentRequestDto;
import ru.stankin.uits.module.students.dto.StudentResponseDto;
import ru.stankin.uits.module.students.entity.Postgraduate;
import ru.stankin.uits.module.students.entity.Student;
import ru.stankin.uits.module.students.enums.EducationLevel;
import ru.stankin.uits.module.students.repository.PostgraduateRepository;
import ru.stankin.uits.module.students.repository.StudentRepository;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class PostgraduateIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private TeacherRepository teacherRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private PostgraduateRepository postgraduateRepository;

    @Autowired
    private EntityManagerFactory entityManagerFactory;

    private Teacher chekanin;
    private Teacher razumovskiy;
    private Postgraduate abramov;
    private Postgraduate yakovlev;

    @BeforeEach
    void setUp() {
        chekanin = teacher("Чеканин", "Владимир", "Алексеевич");
        razumovskiy = teacher("Разумовский", "Алексей", "Игоревич");

        yakovlev = record(student("Яковлев", "Иван", "2.3.1"), chekanin);
        abramov = record(student("Абрамов", "Пётр", "1.2.2"), razumovskiy);
    }

    private Teacher teacher(String lastName, String firstName, String patronymic) {
        return teacherRepository.save(Teacher.builder()
                .lastName(lastName)
                .firstName(firstName)
                .patronymic(patronymic)
                .build());
    }

    private Student student(String lastName, String firstName, String speciality) {
        return studentRepository.save(Student.builder()
                .lastName(lastName)
                .firstName(firstName)
                .group("ИДМ-24-01")
                .educationLevel(EducationLevel.POSTGRADUATE)
                .speciality(speciality)
                .diplomaTheme("Тема " + lastName)
                .admissionYear(2024)
                .build());
    }

    private Postgraduate record(Student student, Teacher teacher) {
        return postgraduateRepository.save(Postgraduate.builder()
                .student(student)
                .teacher(teacher)
                .build());
    }

    private StudentRequestDto studentRequest(String lastName, EducationLevel level, int admissionYear) {
        return StudentRequestDto.builder()
                .lastName(lastName)
                .firstName("Пётр")
                .group("ИДМ-24-01")
                .educationLevel(level)
                .speciality("2.3.1")
                .diplomaTheme("Тема")
                .admissionYear(admissionYear)
                .build();
    }

    private HttpHeaders authJson(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);

        return headers;
    }

    private String moderatorToken() {
        createUser("moder", TestRole.MODERATOR);

        return login("moder");
    }

    private List<PostgraduateResponseDto> list(String query) {
        ResponseEntity<PageResponseDto<PostgraduateResponseDto>> response = restTemplate.exchange(
                "/api/public/postgraduates" + query,
                HttpMethod.GET,
                null,
                new ParameterizedTypeReference<>() {
                }
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();

        return response.getBody().content();
    }

    private ResponseEntity<PostgraduateDetailsResponseDto> details(String token, Long id) {
        return restTemplate.exchange(
                "/api/postgraduates/" + id,
                HttpMethod.GET,
                new HttpEntity<>(authJson(token)),
                PostgraduateDetailsResponseDto.class
        );
    }

    private Statistics statistics() {
        return entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
    }

    @Test
    void listIsOrderedByStudentLastName() {
        assertThat(list(""))
                .extracting(PostgraduateResponseDto::getStudentName)
                .containsExactly("Абрамов Пётр", "Яковлев Иван");
    }

    @Test
    void listCarriesStudentAndSupervisorFields() {
        PostgraduateResponseDto card = list("").getFirst();

        assertThat(card.getId()).isEqualTo(abramov.getId());
        assertThat(card.getSpeciality()).isEqualTo("1.2.2");
        assertThat(card.getDiplomaTheme()).isEqualTo("Тема Абрамов");
        assertThat(card.getAdmissionYear()).isEqualTo(2024);
        assertThat(card.getTeacherId()).isEqualTo(razumovskiy.getId());
        assertThat(card.getTeacherName()).isEqualTo("Разумовский Алексей Игоревич");
    }

    @Test
    void teacherIdFilterNarrowsSelection() {
        assertThat(list("?teacherId=" + chekanin.getId()))
                .extracting(PostgraduateResponseDto::getId)
                .containsExactly(yakovlev.getId());
    }

    @Test
    void specialityFilterNarrowsSelection() {
        assertThat(list("?speciality=1.2.2"))
                .extracting(PostgraduateResponseDto::getId)
                .containsExactly(abramov.getId());
    }

    @Test
    void bothFiltersApplyTogether() {
        assertThat(list("?teacherId=" + chekanin.getId() + "&speciality=1.2.2")).isEmpty();
        assertThat(list("?teacherId=" + razumovskiy.getId() + "&speciality=1.2.2"))
                .extracting(PostgraduateResponseDto::getId)
                .containsExactly(abramov.getId());
    }

    @Test
    void blankSpecialityIsTreatedAsNoFilter() {
        assertThat(list("?speciality=")).hasSize(2);
    }

    @Test
    void recordWithoutSupervisorComesWithNulls() {
        postgraduateRepository.save(Postgraduate.builder()
                .student(student("Сидоров", "Олег", "1.2.2"))
                .build());

        PostgraduateResponseDto card = list("").stream()
                .filter(dto -> "Сидоров Олег".equals(dto.getStudentName()))
                .findFirst()
                .orElseThrow();

        assertThat(card.getTeacherId()).isNull();
        assertThat(card.getTeacherName()).isNull();
    }

    @Test
    void listIsFetchedWithoutExtraQueries() {
        Statistics statistics = statistics();
        statistics.setStatisticsEnabled(true);
        statistics.clear();

        list("");

        assertThat(statistics.getPrepareStatementCount()).isEqualTo(1);
    }

    @Test
    void detailsCarryEveryFieldTheFormNeeds() {
        PostgraduateDetailsResponseDto card = details(moderatorToken(), abramov.getId()).getBody();

        assertThat(card).isNotNull();
        assertThat(card.getId()).isEqualTo(abramov.getId());
        assertThat(card.getTeacherId()).isEqualTo(razumovskiy.getId());

        StudentResponseDto student = card.getStudent();
        assertThat(student.getLastName()).isEqualTo("Абрамов");
        assertThat(student.getFirstName()).isEqualTo("Пётр");
        assertThat(student.getPatronymic()).isNull();
        assertThat(student.getGroup()).isEqualTo("ИДМ-24-01");
        assertThat(student.getEducationLevel()).isEqualTo(EducationLevel.POSTGRADUATE);
        assertThat(student.getSpeciality()).isEqualTo("1.2.2");
        assertThat(student.getDiplomaTheme()).isEqualTo("Тема Абрамов");
        assertThat(student.getAdmissionYear()).isEqualTo(2024);
    }

    @Test
    void detailsSentBackIntoUpdateChangeNothing() {
        String token = moderatorToken();
        ResponseEntity<String> card = restTemplate.exchange(
                "/api/postgraduates/" + abramov.getId(),
                HttpMethod.GET,
                new HttpEntity<>(authJson(token)),
                String.class
        );

        assertThat(card.getStatusCode()).isEqualTo(HttpStatus.OK);

        ResponseEntity<PostgraduateResponseDto> saved = restTemplate.exchange(
                "/api/postgraduates/" + abramov.getId(),
                HttpMethod.PUT,
                new HttpEntity<>(card.getBody(), authJson(token)),
                PostgraduateResponseDto.class
        );

        assertThat(saved.getStatusCode()).isEqualTo(HttpStatus.OK);

        Student student = studentRepository.findById(abramov.getStudent().getId()).orElseThrow();
        assertThat(student.getLastName()).isEqualTo("Абрамов");
        assertThat(student.getFirstName()).isEqualTo("Пётр");
        assertThat(student.getPatronymic()).isNull();
        assertThat(student.getGroup()).isEqualTo("ИДМ-24-01");
        assertThat(student.getSpeciality()).isEqualTo("1.2.2");
        assertThat(student.getDiplomaTheme()).isEqualTo("Тема Абрамов");
        assertThat(student.getAdmissionYear()).isEqualTo(2024);
        assertThat(postgraduateRepository.findWithDetailsById(abramov.getId()).orElseThrow().getTeacher().getId())
                .isEqualTo(razumovskiy.getId());
    }

    @Test
    void publicListStillHidesStudentGroup() {
        ResponseEntity<String> response = restTemplate.getForEntity("/api/public/postgraduates", String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody())
                .doesNotContain("\"group\"")
                .doesNotContain("ИДМ-24-01");
    }

    @Test
    void detailsAreClosedToAnonymous() {
        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/postgraduates/" + abramov.getId(),
                HttpMethod.GET,
                null,
                ProblemDetail.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void detailsAreClosedToTeacher() {
        createUser("teach", TestRole.TEACHER);

        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/postgraduates/" + abramov.getId(),
                HttpMethod.GET,
                new HttpEntity<>(authJson(login("teach"))),
                ProblemDetail.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void detailsOfUnknownRecordReturn404() {
        ResponseEntity<PostgraduateDetailsResponseDto> response = details(moderatorToken(), 999999L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void createStoresStudentAndRecord() {
        PostgraduateRequestDto request = PostgraduateRequestDto.builder()
                .student(studentRequest("Новиков", EducationLevel.POSTGRADUATE, 2023))
                .teacherId(chekanin.getId())
                .build();

        ResponseEntity<PostgraduateResponseDto> response = restTemplate.exchange(
                "/api/postgraduates",
                HttpMethod.POST,
                new HttpEntity<>(request, authJson(moderatorToken())),
                PostgraduateResponseDto.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getHeaders().getLocation()).isNotNull();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getStudentName()).isEqualTo("Новиков Пётр");
        assertThat(response.getBody().getTeacherName()).isEqualTo("Чеканин Владимир Алексеевич");
        assertThat(studentRepository.count()).isEqualTo(3);
    }

    @Test
    void createWithNonPostgraduateLevelReturns400() {
        PostgraduateRequestDto request = PostgraduateRequestDto.builder()
                .student(studentRequest("Новиков", EducationLevel.MASTER, 2023))
                .teacherId(chekanin.getId())
                .build();

        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/postgraduates",
                HttpMethod.POST,
                new HttpEntity<>(request, authJson(moderatorToken())),
                ProblemDetail.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(studentRepository.count()).isEqualTo(2);
    }

    @Test
    void createWithFutureAdmissionYearReturns400() {
        PostgraduateRequestDto request = PostgraduateRequestDto.builder()
                .student(studentRequest("Новиков", EducationLevel.POSTGRADUATE, LocalDate.now().getYear() + 1))
                .teacherId(chekanin.getId())
                .build();

        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/postgraduates",
                HttpMethod.POST,
                new HttpEntity<>(request, authJson(moderatorToken())),
                ProblemDetail.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(studentRepository.count()).isEqualTo(2);
    }

    @Test
    void createWithUnknownTeacherReturns400() {
        PostgraduateRequestDto request = PostgraduateRequestDto.builder()
                .student(studentRequest("Новиков", EducationLevel.POSTGRADUATE, 2023))
                .teacherId(999999L)
                .build();

        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/postgraduates",
                HttpMethod.POST,
                new HttpEntity<>(request, authJson(moderatorToken())),
                ProblemDetail.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void updateReplacesStudentFieldsAndSupervisor() {
        PostgraduateRequestDto request = PostgraduateRequestDto.builder()
                .student(studentRequest("Абрамов-Ковалёв", EducationLevel.POSTGRADUATE, 2022))
                .teacherId(chekanin.getId())
                .build();

        ResponseEntity<PostgraduateResponseDto> response = restTemplate.exchange(
                "/api/postgraduates/" + abramov.getId(),
                HttpMethod.PUT,
                new HttpEntity<>(request, authJson(moderatorToken())),
                PostgraduateResponseDto.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getStudentName()).isEqualTo("Абрамов-Ковалёв Пётр");
        assertThat(response.getBody().getAdmissionYear()).isEqualTo(2022);
        assertThat(response.getBody().getTeacherId()).isEqualTo(chekanin.getId());
        assertThat(response.getBody().getStudentId()).isEqualTo(abramov.getStudent().getId());
        assertThat(studentRepository.count()).isEqualTo(2);
    }

    @Test
    void updateWithNonPostgraduateLevelReturns400() {
        PostgraduateRequestDto request = PostgraduateRequestDto.builder()
                .student(studentRequest("Абрамов", EducationLevel.BACHELOR, 2022))
                .teacherId(chekanin.getId())
                .build();

        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/postgraduates/" + abramov.getId(),
                HttpMethod.PUT,
                new HttpEntity<>(request, authJson(moderatorToken())),
                ProblemDetail.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(studentRepository.findById(abramov.getStudent().getId()).orElseThrow().getAdmissionYear())
                .isEqualTo(2024);
    }

    @Test
    void updateOfUnknownRecordReturns404() {
        PostgraduateRequestDto request = PostgraduateRequestDto.builder()
                .student(studentRequest("Новиков", EducationLevel.POSTGRADUATE, 2023))
                .build();

        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/postgraduates/999999",
                HttpMethod.PUT,
                new HttpEntity<>(request, authJson(moderatorToken())),
                ProblemDetail.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void deleteRemovesRecordWithItsStudent() {
        ResponseEntity<Void> response = restTemplate.exchange(
                "/api/postgraduates/" + abramov.getId(),
                HttpMethod.DELETE,
                new HttpEntity<>(authJson(moderatorToken())),
                Void.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(postgraduateRepository.findById(abramov.getId())).isEmpty();
        assertThat(studentRepository.findById(abramov.getStudent().getId())).isEmpty();
        assertThat(list("")).hasSize(1);
    }

    @Test
    void deletingTeacherKeepsRecordAndClearsSupervisor() {
        teacherRepository.deleteById(razumovskiy.getId());

        PostgraduateResponseDto card = list("").stream()
                .filter(dto -> abramov.getId().equals(dto.getId()))
                .findFirst()
                .orElseThrow();

        assertThat(card.getTeacherId()).isNull();
        assertThat(card.getStudentName()).isEqualTo("Абрамов Пётр");
    }
}
