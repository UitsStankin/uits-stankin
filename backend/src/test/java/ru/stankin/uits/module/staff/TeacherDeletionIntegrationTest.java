package ru.stankin.uits.module.staff;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import ru.stankin.uits.AbstractIntegrationTest;
import ru.stankin.uits.TestRole;
import ru.stankin.uits.module.achievements.entity.Achievement;
import ru.stankin.uits.module.achievements.repository.AchievementRepository;
import ru.stankin.uits.module.gradesheets.entity.GradeSheet;
import ru.stankin.uits.module.gradesheets.repository.GradeSheetRepository;
import ru.stankin.uits.module.schedule.entity.ExamSchedule;
import ru.stankin.uits.module.schedule.entity.Schedule;
import ru.stankin.uits.module.schedule.repository.ExamScheduleRepository;
import ru.stankin.uits.module.schedule.repository.ScheduleRepository;
import ru.stankin.uits.module.staff.entity.Teacher;
import ru.stankin.uits.module.staff.repository.TeacherRepository;
import ru.stankin.uits.module.students.entity.Postgraduate;
import ru.stankin.uits.module.students.repository.PostgraduateRepository;
import ru.stankin.uits.module.user.entity.User;

import java.time.OffsetDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class TeacherDeletionIntegrationTest extends AbstractIntegrationTest {

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
    private GradeSheetRepository gradeSheetRepository;

    @Test
    void deleteTeacher_TakesScheduleAndExamScheduleWithIt() {
        Teacher card = createCard();
        Long scheduleId = scheduleRepository.save(Schedule.builder()
                .teacher(card)
                .importedFileName("raspisanie.pdf")
                .build()).getId();
        Long examScheduleId = examScheduleRepository.save(ExamSchedule.builder()
                .teacher(card)
                .importedFileName("ekzameny.pdf")
                .build()).getId();

        assertThat(deleteCard(card.getId()).getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        assertThat(scheduleRepository.findById(scheduleId)).isEmpty();
        assertThat(examScheduleRepository.findById(examScheduleId)).isEmpty();
    }

    @Test
    void deleteTeacher_LeavesAchievementPostgraduateAndGradeSheetWithoutOwner() {
        Teacher card = createCard();
        Long achievementId = achievementRepository.save(Achievement.builder()
                .title("Победа в конкурсе")
                .description("Краткое описание")
                .content("<p>Подробности</p>")
                .previewImage("achievements/2026/09/a1.jpg")
                .teacher(card)
                .build()).getId();
        Long postgraduateId = postgraduateRepository.save(Postgraduate.builder()
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

        assertThat(deleteCard(card.getId()).getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        assertThat(achievementRepository.findById(achievementId)).get()
                .extracting(Achievement::getTeacher)
                .isNull();
        assertThat(postgraduateRepository.findById(postgraduateId)).get()
                .extracting(Postgraduate::getTeacher)
                .isNull();
        GradeSheet gradeSheet = gradeSheetRepository.findById(gradeSheetId).orElseThrow();
        assertThat(gradeSheet.getTeacher()).isNull();
        assertThat(gradeSheet.getImportedTeachers()).isEqualTo("Иванова М. П.");
    }

    @Test
    void deleteTeacher_KeepsLinkedAccount() {
        User teacherUser = createUser("teacher_user", TestRole.TEACHER);
        Teacher card = createCard();
        card.setUser(teacherUser);
        teacherRepository.save(card);

        assertThat(deleteCard(card.getId()).getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        assertThat(userRepository.findById(teacherUser.getId())).get()
                .extracting(User::isActive)
                .isEqualTo(true);
    }

    private Teacher createCard() {
        return teacherRepository.save(Teacher.builder()
                .lastName("Иванова")
                .firstName("Мария")
                .position("доцент")
                .build());
    }

    private ResponseEntity<Void> deleteCard(Long id) {
        createUser("moder", TestRole.MODERATOR);
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(login("moder"));

        return restTemplate.exchange(
                "/api/teachers/" + id,
                HttpMethod.DELETE,
                new HttpEntity<>(headers),
                Void.class
        );
    }
}
