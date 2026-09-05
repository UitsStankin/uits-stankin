package ru.stankin.uits.module.gradesheets;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import ru.stankin.uits.AbstractIntegrationTest;
import ru.stankin.uits.TestRole;
import ru.stankin.uits.common.PageResponseDto;
import ru.stankin.uits.module.gradesheets.dto.GradeSheetDetailsResponseDto;
import ru.stankin.uits.module.gradesheets.dto.GradeSheetResponseDto;
import ru.stankin.uits.module.gradesheets.dto.GradeSheetStudentResponseDto;
import ru.stankin.uits.module.gradesheets.entity.GradeSheet;
import ru.stankin.uits.module.gradesheets.entity.GradeSheetMark;
import ru.stankin.uits.module.gradesheets.entity.GradeSheetStudent;
import ru.stankin.uits.module.gradesheets.repository.GradeSheetRepository;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class GradeSheetReadIntegrationTest extends AbstractIntegrationTest {

    private static final String DISCIPLINE = "Технические средства информационных систем";
    private static final String OTHER_DISCIPLINE = "Базы данных";
    private static final String SEMESTER = "Весенний семестр 2025/2026 учебного года";

    @Autowired
    private GradeSheetRepository gradeSheetRepository;

    private String adminToken;
    private Long firstSheetId;

    @BeforeEach
    void setUp() {
        createUser("gradesheet-reader", TestRole.ADMIN);
        adminToken = login("gradesheet-reader");

        firstSheetId = save(DISCIPLINE, "ИДБ-25-11", SEMESTER).getId();
        save(DISCIPLINE, "ИДБ-25-12", SEMESTER);
        save(OTHER_DISCIPLINE, "ИДБ-24-11", "Осенний семестр 2025/2026 учебного года");
    }

    private GradeSheet save(String discipline, String group, String semester) {
        GradeSheet sheet = GradeSheet.builder()
                .disciplineName(discipline)
                .group(group)
                .semester(semester)
                .department("УИТС")
                .direction("09.03.03 «Прикладная информатика»")
                .importedTeachers("Чеканин В.А., Ступивцев А.В.")
                .importedFileName("gradesheet.xlsx")
                .build();

        GradeSheetStudent first = GradeSheetStudent.builder()
                .studentNumber(1)
                .lastName("Абрамов")
                .firstName("Александр")
                .patronymic("Абдул-Керимович")
                .build();
        first.addMark(GradeSheetMark.builder().block("М1").score(new BigDecimal("30.00")).build());
        first.addMark(GradeSheetMark.builder()
                .block("Зачёт")
                .grade("зачтено")
                .date(LocalDate.of(2026, 6, 2))
                .teacherName("Чеканин В.А.")
                .build());

        GradeSheetStudent second = GradeSheetStudent.builder()
                .studentNumber(2)
                .lastName("Виноградов")
                .firstName("Денис")
                .build();
        second.addMark(GradeSheetMark.builder().block("Зачёт").text("не допущен").build());

        sheet.addStudent(first);
        sheet.addStudent(second);
        return gradeSheetRepository.save(sheet);
    }

    private HttpEntity<Void> auth(String token) {
        HttpHeaders headers = new HttpHeaders();
        if (token != null) {
            headers.setBearerAuth(token);
        }
        return new HttpEntity<>(headers);
    }

    private ResponseEntity<PageResponseDto<GradeSheetResponseDto>> list(String query) {
        return restTemplate.exchange("/api/gradesheets" + query, HttpMethod.GET, auth(adminToken),
                new ParameterizedTypeReference<>() {
                });
    }

    @Test
    void listsEveryImportedSheet() {
        PageResponseDto<GradeSheetResponseDto> page = list("").getBody();

        assertThat(page.totalElements()).isEqualTo(3);
        assertThat(page.content()).extracting(GradeSheetResponseDto::getGroup)
                .contains("ИДБ-25-11", "ИДБ-25-12", "ИДБ-24-11");
    }

    @Test
    void listCarriesStudentCountWithoutStudents() {
        GradeSheetResponseDto row = list("?group=ИДБ-25-11").getBody().content().getFirst();

        assertThat(row.getStudentCount()).isEqualTo(2);
        assertThat(row.getDiscipline()).isEqualTo(DISCIPLINE);
        assertThat(row.getTeachers()).isEqualTo("Чеканин В.А., Ступивцев А.В.");
        assertThat(row.getImportedAt()).isNotNull();
    }

    @Test
    void filtersByGroupExactly() {
        PageResponseDto<GradeSheetResponseDto> page = list("?group=идб-25-11").getBody();

        assertThat(page.totalElements()).isEqualTo(1);
        assertThat(page.content().getFirst().getGroup()).isEqualTo("ИДБ-25-11");
    }

    @Test
    void filtersByDisciplineSubstring() {
        assertThat(list("?discipline=Базы").getBody().totalElements()).isEqualTo(1);
    }

    @Test
    void filtersBySemester() {
        assertThat(list("?semester=" + SEMESTER).getBody().totalElements()).isEqualTo(2);
    }

    @Test
    void percentInFilterIsNotAWildcard() {
        assertThat(list("?discipline=%").getBody().totalElements()).isZero();
    }

    @Test
    void unknownSortFieldIsRejected() {
        ResponseEntity<String> response = restTemplate.exchange(
                "/api/gradesheets?sort=importedTeachers", HttpMethod.GET, auth(adminToken), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void detailsCarryStudentsMarksAndBlocks() {
        ResponseEntity<GradeSheetDetailsResponseDto> response = restTemplate.exchange(
                "/api/gradesheets/" + firstSheetId, HttpMethod.GET, auth(adminToken),
                GradeSheetDetailsResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        GradeSheetDetailsResponseDto details = response.getBody();
        assertThat(details.getDiscipline()).isEqualTo(DISCIPLINE);
        assertThat(details.getBlocks()).containsExactly("М1", "Зачёт");
        assertThat(details.getStudents()).extracting(GradeSheetStudentResponseDto::getLastName)
                .containsExactly("Абрамов", "Виноградов");

        GradeSheetStudentResponseDto first = details.getStudents().getFirst();
        assertThat(first.getNumber()).isEqualTo(1);
        assertThat(first.getPatronymic()).isEqualTo("Абдул-Керимович");
        assertThat(first.getMarks()).hasSize(2);
        assertThat(first.getMarks().getFirst().getScore()).isEqualByComparingTo("30.00");
        assertThat(first.getMarks().getLast().getGrade()).isEqualTo("зачтено");
        assertThat(first.getMarks().getLast().getTeacher()).isEqualTo("Чеканин В.А.");
    }

    @Test
    void textMarkComesBackInItsOwnField() {
        GradeSheetDetailsResponseDto details = restTemplate.exchange(
                "/api/gradesheets/" + firstSheetId, HttpMethod.GET, auth(adminToken),
                GradeSheetDetailsResponseDto.class).getBody();

        assertThat(details.getStudents().getLast().getMarks().getFirst().getText())
                .isEqualTo("не допущен");
    }

    @Test
    void unknownSheetIsNotFound() {
        ResponseEntity<String> response = restTemplate.exchange(
                "/api/gradesheets/99999", HttpMethod.GET, auth(adminToken), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void anonymousCannotRead() {
        ResponseEntity<String> response = restTemplate.exchange(
                "/api/gradesheets", HttpMethod.GET, auth(null), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void teacherCannotRead() {
        createUser("gradesheet-teacher-reader", TestRole.TEACHER);

        ResponseEntity<String> response = restTemplate.exchange(
                "/api/gradesheets", HttpMethod.GET, auth(login("gradesheet-teacher-reader")),
                String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }
}
