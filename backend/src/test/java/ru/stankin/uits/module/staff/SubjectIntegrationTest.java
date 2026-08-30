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
import ru.stankin.uits.module.staff.repository.SubjectRepository;

import static org.assertj.core.api.Assertions.assertThat;

public class SubjectIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private SubjectRepository subjectRepository;

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
