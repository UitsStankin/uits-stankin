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
import ru.stankin.uits.module.staff.dto.SubjectRequestDto;
import ru.stankin.uits.module.staff.entity.Subject;
import ru.stankin.uits.module.staff.entity.Teacher;
import ru.stankin.uits.module.staff.repository.SubjectRepository;
import ru.stankin.uits.module.staff.repository.TeacherRepository;

import static org.assertj.core.api.Assertions.assertThat;

public class SubjectIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private SubjectRepository subjectRepository;

    @Autowired
    private TeacherRepository teacherRepository;

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

    private Subject subject(String name) {
        return subjectRepository.save(Subject.builder().name(name).build());
    }

    private void assignToTeacher(Subject subject) {
        Teacher teacher = teacherRepository.save(Teacher.builder()
                .lastName("Иванова")
                .firstName("Мария")
                .position("доцент")
                .build());
        teacher.getSubjects().add(subject);
        teacherRepository.save(teacher);
    }

    private ResponseEntity<ProblemDetail> deleteSubject(Long id, String token) {
        return restTemplate.exchange(
                "/api/subjects/" + id,
                HttpMethod.DELETE,
                new HttpEntity<>(authJson(token)),
                ProblemDetail.class
        );
    }

    @Test
    void updateSubject_ChangesNameAndDescription() {
        Subject stored = subject("Базы даных");

        ResponseEntity<SubjectDto> response = restTemplate.exchange(
                "/api/subjects/" + stored.getId(),
                HttpMethod.PUT,
                new HttpEntity<>(SubjectRequestDto.builder()
                        .name("Базы данных")
                        .description("Реляционная модель, SQL")
                        .build(), authJson(moderatorToken())),
                SubjectDto.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getId()).isEqualTo(stored.getId());
        assertThat(subjectRepository.findById(stored.getId()).orElseThrow().getName()).isEqualTo("Базы данных");
    }

    @Test
    void updateSubject_WhenNameTakenByAnother_Returns409() {
        subject("Базы данных");
        Subject stored = subject("Проектирование ИС");

        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/subjects/" + stored.getId(),
                HttpMethod.PUT,
                new HttpEntity<>(SubjectRequestDto.builder().name("Базы данных").build(), authJson(moderatorToken())),
                ProblemDetail.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(subjectRepository.findById(stored.getId()).orElseThrow().getName()).isEqualTo("Проектирование ИС");
    }

    @Test
    void updateSubject_WhenUnknownId_Returns404() {
        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/subjects/999999",
                HttpMethod.PUT,
                new HttpEntity<>(SubjectRequestDto.builder().name("Базы данных").build(), authJson(moderatorToken())),
                ProblemDetail.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void deleteSubject_WhenNotAssigned_Returns204() {
        Subject stored = subject("Базы данных");

        assertThat(deleteSubject(stored.getId(), moderatorToken()).getStatusCode())
                .isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(subjectRepository.findById(stored.getId())).isEmpty();
    }

    @Test
    void deleteSubject_WhenAssignedToTeacher_Returns409AndKeepsSubject() {
        Subject stored = subject("Базы данных");
        assignToTeacher(stored);

        ResponseEntity<ProblemDetail> response = deleteSubject(stored.getId(), moderatorToken());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getDetail())
                .as("отказ обязан объяснять причину: без явной проверки тот же 409 "
                        + "прилетел бы от внешнего ключа с текстом «Конфликт данных.»")
                .contains("назначена преподавателям");
        assertThat(subjectRepository.findById(stored.getId())).isPresent();
    }

    @Test
    void deleteSubject_WhenUnknownId_Returns404() {
        assertThat(deleteSubject(999999L, moderatorToken()).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void getSubjects_ReturnsPageSortedByName() {
        subjectRepository.save(Subject.builder().name("Проектирование ИС").build());
        subjectRepository.save(Subject.builder().name("Базы данных").build());

        ResponseEntity<PageResponseDto<SubjectDto>> response = restTemplate.exchange(
                "/api/subjects",
                HttpMethod.GET,
                new HttpEntity<>(authJson(moderatorToken())),
                new ParameterizedTypeReference<>() {});

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        PageResponseDto<SubjectDto> body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.totalElements()).isEqualTo(2);
        assertThat(body.content().getFirst().getName()).isEqualTo("Базы данных");
        assertThat(body.content().getLast().getName()).isEqualTo("Проектирование ИС");
    }

    @Test
    void createSubject_Returns201WithBody() {
        ResponseEntity<SubjectDto> response = restTemplate.exchange(
                "/api/subjects",
                HttpMethod.POST,
                new HttpEntity<>(SubjectRequestDto.builder().name("Базы данных").build(),
                        authJson(moderatorToken())),
                SubjectDto.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getId()).isNotNull();
        assertThat(response.getBody().getName()).isEqualTo("Базы данных");
    }

    @Test
    void createSubject_StoresAndReturnsDescription() {
        ResponseEntity<SubjectDto> response = restTemplate.exchange(
                "/api/subjects",
                HttpMethod.POST,
                new HttpEntity<>(SubjectRequestDto.builder()
                        .name("Базы данных")
                        .description("Реляционная модель, SQL, транзакции")
                        .build(), authJson(moderatorToken())),
                SubjectDto.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getDescription()).isEqualTo("Реляционная модель, SQL, транзакции");
        assertThat(subjectRepository.findById(response.getBody().getId()).orElseThrow().getDescription())
                .isEqualTo("Реляционная модель, SQL, транзакции");
    }

    @Test
    void createSubject_WithoutDescription_KeepsItNull() {
        ResponseEntity<SubjectDto> response = restTemplate.exchange(
                "/api/subjects",
                HttpMethod.POST,
                new HttpEntity<>(SubjectRequestDto.builder().name("Алгоритмы").build(),
                        authJson(moderatorToken())),
                SubjectDto.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getDescription()).isNull();
    }

    @Test
    void createSubject_WhenNameAlreadyExists_Returns409() {
        subjectRepository.save(Subject.builder().name("Базы данных").build());

        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/subjects",
                HttpMethod.POST,
                new HttpEntity<>(SubjectRequestDto.builder().name("Базы данных").build(),
                        authJson(moderatorToken())),
                ProblemDetail.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }
}
