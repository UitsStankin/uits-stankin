package ru.stankin.uits.module.staff;

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
import ru.stankin.uits.module.staff.dto.SubjectDto;
import ru.stankin.uits.module.staff.dto.TeacherDetailsResponseDto;
import ru.stankin.uits.module.staff.dto.TeacherRequestDto;
import ru.stankin.uits.module.staff.dto.TeacherResponseDto;
import ru.stankin.uits.module.staff.entity.Subject;
import ru.stankin.uits.module.staff.entity.Teacher;
import ru.stankin.uits.module.staff.enums.TeacherDegree;
import ru.stankin.uits.module.staff.enums.TeacherRank;
import ru.stankin.uits.module.staff.repository.SubjectRepository;
import ru.stankin.uits.module.staff.repository.TeacherRepository;
import ru.stankin.uits.module.user.entity.User;

import java.io.IOException;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

public class TeacherIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private TeacherRepository teacherRepository;

    @Autowired
    private SubjectRepository subjectRepository;

    private Teacher createCard(String lastName, String firstName) {
        return teacherRepository.save(Teacher.builder()
                .lastName(lastName)
                .firstName(firstName)
                .position("доцент")
                .build());
    }

    private Subject createSubject(String name) {
        return subjectRepository.save(Subject.builder().name(name).build());
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

    @Test
    void getTeachers_ReturnsPageSortedByLastName_WithoutAccounts() {
        createCard("Яковлев", "Пётр");
        createCard("Абрамов", "Иван");

        ResponseEntity<PageResponseDto<TeacherResponseDto>> response = restTemplate.exchange(
                "/api/public/teachers",
                HttpMethod.GET,
                null,
                new ParameterizedTypeReference<>() {});

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        PageResponseDto<TeacherResponseDto> body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.totalElements()).isEqualTo(2);
        assertThat(body.content().getFirst().getLastName()).isEqualTo("Абрамов");
        assertThat(body.content().getLast().getLastName()).isEqualTo("Яковлев");
    }

    @Test
    void getTeachers_WhenSortFieldIsUnknown_Returns400() {
        ResponseEntity<ProblemDetail> response = restTemplate.getForEntity(
                "/api/public/teachers?sort=abc",
                ProblemDetail.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getDetail()).contains("abc");
    }

    @Test
    void getTeacherDetails_ReturnsCardWithSubjectsSortedByName() {
        Teacher card = createCard("Иванова", "Мария");
        card.setDegree(TeacherDegree.CANDIDATE_TECH);
        card.setRank(TeacherRank.READER);
        card.getSubjects().add(createSubject("Проектирование ИС"));
        card.getSubjects().add(createSubject("Базы данных"));
        teacherRepository.save(card);

        ResponseEntity<TeacherDetailsResponseDto> response = restTemplate.getForEntity(
                "/api/public/teachers/" + card.getId(),
                TeacherDetailsResponseDto.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        TeacherDetailsResponseDto body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.getDegree()).isEqualTo("CANDIDATE_TECH");
        assertThat(body.getRank()).isEqualTo("READER");
        assertThat(body.getSubjects())
                .extracting(SubjectDto::getName)
                .containsExactly("Базы данных", "Проектирование ИС");
    }

    @Test
    void getTeacherDetails_WhenUnknownId_Returns404() {
        ResponseEntity<ProblemDetail> response = restTemplate.getForEntity(
                "/api/public/teachers/9999",
                ProblemDetail.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void createTeacher_AsModerator_Returns201WithLocationAndSubjects() {
        Subject subject = createSubject("Базы данных");
        TeacherRequestDto request = TeacherRequestDto.builder()
                .lastName("Сидоров")
                .firstName("Олег")
                .patronymic("Иванович")
                .position("профессор")
                .degree(TeacherDegree.DOCTOR_TECH)
                .rank(TeacherRank.PROFESSOR)
                .subjectIds(List.of(subject.getId()))
                .build();

        ResponseEntity<TeacherDetailsResponseDto> response = restTemplate.exchange(
                "/api/teachers",
                HttpMethod.POST,
                new HttpEntity<>(request, authJson(moderatorToken())),
                TeacherDetailsResponseDto.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        TeacherDetailsResponseDto body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.getId()).isNotNull();
        assertThat(response.getHeaders().getLocation())
                .isNotNull()
                .hasToString(restTemplate.getRootUri() + "/api/teachers/" + body.getId());
        assertThat(body.getSubjects()).extracting(SubjectDto::getName).containsExactly("Базы данных");
    }

    @Test
    void createTeacher_WithUnknownSubjectId_Returns400() {
        TeacherRequestDto request = TeacherRequestDto.builder()
                .lastName("Сидоров")
                .firstName("Олег")
                .position("профессор")
                .subjectIds(List.of(9999L))
                .build();

        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/teachers",
                HttpMethod.POST,
                new HttpEntity<>(request, authJson(moderatorToken())),
                ProblemDetail.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getDetail()).contains("9999");
    }

    @Test
    void createTeacher_WithUnknownDegreeCode_Returns400() {
        String body = "{\"lastName\":\"Тестов\",\"firstName\":\"Тест\","
                + "\"position\":\"доцент\",\"degree\":\"KANDIDAT\"}";

        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/teachers",
                HttpMethod.POST,
                new HttpEntity<>(body, authJson(moderatorToken())),
                ProblemDetail.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void updateTeacher_ReplacesFieldsAndSubjects() {
        Teacher card = createCard("Иванова", "Мария");
        card.getSubjects().add(createSubject("Базы данных"));
        teacherRepository.save(card);
        Subject newSubject = createSubject("Веб-разработка");

        TeacherRequestDto request = TeacherRequestDto.builder()
                .lastName("Иванова")
                .firstName("Мария")
                .position("профессор")
                .rank(TeacherRank.PROFESSOR)
                .subjectIds(List.of(newSubject.getId()))
                .build();

        ResponseEntity<TeacherDetailsResponseDto> response = restTemplate.exchange(
                "/api/teachers/" + card.getId(),
                HttpMethod.PUT,
                new HttpEntity<>(request, authJson(moderatorToken())),
                TeacherDetailsResponseDto.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        TeacherDetailsResponseDto body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.getPosition()).isEqualTo("профессор");
        assertThat(body.getRank()).isEqualTo("PROFESSOR");
        assertThat(body.getSubjects()).extracting(SubjectDto::getName).containsExactly("Веб-разработка");
    }

    @Test
    void updateTeacher_WhenOptionalFieldsAreBlank_SavesNull() {
        Teacher card = createCard("Иванова", "Мария");

        TeacherRequestDto request = TeacherRequestDto.builder()
                .lastName("Иванова")
                .firstName("Мария")
                .position("доцент")
                .patronymic("")
                .email("   ")
                .build();

        ResponseEntity<TeacherDetailsResponseDto> response = restTemplate.exchange(
                "/api/teachers/" + card.getId(),
                HttpMethod.PUT,
                new HttpEntity<>(request, authJson(moderatorToken())),
                TeacherDetailsResponseDto.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        TeacherDetailsResponseDto body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.getPatronymic()).isNull();
        assertThat(body.getEmail()).isNull();
        Teacher updated = teacherRepository.findById(card.getId()).orElseThrow();
        assertThat(updated.getPatronymic()).isNull();
        assertThat(updated.getEmail()).isNull();
    }

    @Test
    void updateTeacher_WhenAvatarIsBlank_ClearsAvatarAndDeletesFile() throws IOException {
        Teacher card = createCard("Иванова", "Мария");
        String key = storeFile("avatars");
        card.setAvatar(key);
        teacherRepository.save(card);

        TeacherRequestDto request = TeacherRequestDto.builder()
                .lastName("Иванова")
                .firstName("Мария")
                .position("доцент")
                .avatar("")
                .build();

        ResponseEntity<TeacherDetailsResponseDto> response = restTemplate.exchange(
                "/api/teachers/" + card.getId(),
                HttpMethod.PUT,
                new HttpEntity<>(request, authJson(moderatorToken())),
                TeacherDetailsResponseDto.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getAvatarUrl()).isNull();
        assertThat(teacherRepository.findById(card.getId()).orElseThrow().getAvatar()).isNull();
        assertThat(STORAGE_ROOT.resolve(key)).doesNotExist();
    }

    @Test
    void deleteTeacher_Returns204AndCardDisappears() {
        Teacher card = createCard("Иванова", "Мария");
        String token = moderatorToken();

        ResponseEntity<Void> deleteResponse = restTemplate.exchange(
                "/api/teachers/" + card.getId(),
                HttpMethod.DELETE,
                new HttpEntity<>(authJson(token)),
                Void.class
        );

        assertThat(deleteResponse.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(teacherRepository.findById(card.getId())).isEmpty();
    }

    @Test
    void myCard_AsLinkedTeacher_ReturnsOwnCard() {
        User teacherUser = createUser("teacher_user", TestRole.TEACHER);
        Teacher card = createCard("Иванова", "Мария");
        card.setUser(teacherUser);
        teacherRepository.save(card);

        ResponseEntity<TeacherDetailsResponseDto> response = restTemplate.exchange(
                "/api/teachers/me",
                HttpMethod.GET,
                new HttpEntity<>(authJson(login("teacher_user"))),
                TeacherDetailsResponseDto.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getId()).isEqualTo(card.getId());
        assertThat(response.getBody().getLastName()).isEqualTo("Иванова");
    }

    @Test
    void updateMyCard_UpdatesFieldsButIgnoresSubjectIds() {
        User teacherUser = createUser("teacher_user", TestRole.TEACHER);
        Teacher card = createCard("Иванова", "Мария");
        card.setUser(teacherUser);
        card.getSubjects().add(createSubject("Базы данных"));
        teacherRepository.save(card);
        Subject foreignSubject = createSubject("Веб-разработка");

        TeacherRequestDto request = TeacherRequestDto.builder()
                .lastName("Иванова")
                .firstName("Мария")
                .position("доцент")
                .bio("Обновлённая биография")
                .subjectIds(List.of(foreignSubject.getId()))
                .build();

        ResponseEntity<TeacherDetailsResponseDto> response = restTemplate.exchange(
                "/api/teachers/me",
                HttpMethod.PUT,
                new HttpEntity<>(request, authJson(login("teacher_user"))),
                TeacherDetailsResponseDto.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        TeacherDetailsResponseDto body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.getBio()).isEqualTo("Обновлённая биография");
        assertThat(body.getSubjects()).extracting(SubjectDto::getName).containsExactly("Базы данных");
    }

    @Test
    void myCard_WhenNoCardLinked_Returns404() {
        createUser("teacher_user", TestRole.TEACHER);

        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/teachers/me",
                HttpMethod.GET,
                new HttpEntity<>(authJson(login("teacher_user"))),
                ProblemDetail.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }
}
