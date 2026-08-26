package ru.stankin.uits.module.staff;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import ru.stankin.uits.AbstractIntegrationTest;
import ru.stankin.uits.common.PageResponseDto;
import ru.stankin.uits.module.staff.dto.TeacherResponseDto;
import ru.stankin.uits.module.staff.entity.Teacher;
import ru.stankin.uits.module.staff.repository.TeacherRepository;
import ru.stankin.uits.module.user.entity.User;
import ru.stankin.uits.module.user.repository.UserRepository;

import static org.assertj.core.api.Assertions.assertThat;

public class TeacherIntegrationTest extends AbstractIntegrationTest {
    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private TeacherRepository teacherRepository;

    @Autowired
    private UserRepository userRepository;

    private void createTeacher(String username, String firstName, String lastName) {
        User user = User.builder()
                .username(username)
                .password("irrelevant")
                .firstName(firstName)
                .lastName(lastName)
                .active(true)
                .teacher(true)
                .build();
        userRepository.save(user);

        Teacher teacher = Teacher.builder()
                .user(user)
                .lastName(lastName)
                .firstName(firstName)
                .position("доцент")
                .build();
        teacherRepository.save(teacher);
    }

    @Test
    void getTeachers_ReturnsPageSortedByLastName() {
        createTeacher("yakovlev", "Пётр", "Яковлев");
        createTeacher("abramov", "Иван", "Абрамов");

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
}

