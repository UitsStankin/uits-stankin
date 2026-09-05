package ru.stankin.uits.module.gradesheets;

import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import ru.stankin.uits.AbstractIntegrationTest;
import ru.stankin.uits.module.gradesheets.entity.GradeSheet;
import ru.stankin.uits.module.gradesheets.entity.GradeSheetMark;
import ru.stankin.uits.module.gradesheets.entity.GradeSheetStudent;
import ru.stankin.uits.module.staff.entity.Subject;
import ru.stankin.uits.module.staff.entity.Teacher;
import ru.stankin.uits.module.staff.repository.SubjectRepository;
import ru.stankin.uits.module.staff.repository.TeacherRepository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Transactional
class GradeSheetEntityMappingTest extends AbstractIntegrationTest {

    private static final String DISCIPLINE = "Технические средства информационных систем";
    private static final String GROUP = "ИДБ-25-11";
    private static final String SEMESTER = "Весенний семестр 2025/2026 учебного года";

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private TeacherRepository teacherRepository;

    @Autowired
    private SubjectRepository subjectRepository;

    @Autowired
    private JdbcTemplate jdbc;

    private Teacher teacher;

    private Subject subject;

    @BeforeEach
    void createReferences() {
        teacher = teacherRepository.save(Teacher.builder()
                .lastName("Чеканин")
                .firstName("Владислав")
                .position("профессор")
                .build());
        subject = subjectRepository.save(Subject.builder()
                .name(DISCIPLINE)
                .build());
    }

    private GradeSheet persistGradeSheet() {
        GradeSheet sheet = GradeSheet.builder()
                .disciplineName(DISCIPLINE)
                .subject(subject)
                .group(GROUP)
                .semester(SEMESTER)
                .direction("09.03.03 «Прикладная информатика»")
                .department("УИТС")
                .teacher(teacher)
                .importedTeachers("Чеканин В.А., Ступивцев А.В.")
                .importedFileName("gradesheet-idb-25-tsis.xlsx")
                .build();

        GradeSheetStudent first = GradeSheetStudent.builder()
                .studentNumber(1)
                .lastName("Абрамов")
                .firstName("Александр")
                .patronymic("Абдул-Керимович")
                .build();
        first.addMark(GradeSheetMark.builder()
                .block("М1")
                .score(new BigDecimal("30.00"))
                .build());
        first.addMark(GradeSheetMark.builder()
                .block("Зачёт")
                .score(new BigDecimal("30.00"))
                .grade("зачтено")
                .date(LocalDate.of(2026, 6, 2))
                .teacherName("Чеканин В.А.")
                .build());

        GradeSheetStudent second = GradeSheetStudent.builder()
                .studentNumber(19)
                .lastName("Виноградов")
                .firstName("Денис")
                .build();
        second.addMark(GradeSheetMark.builder()
                .block("Зачёт")
                .text("не допущен")
                .date(LocalDate.of(2026, 6, 6))
                .teacherName("Чеканин В.А.")
                .build());

        sheet.addStudent(first);
        sheet.addStudent(second);

        entityManager.persist(sheet);
        entityManager.flush();
        entityManager.clear();
        return sheet;
    }

    @Test
    void savesAndReadsBackWholeTree() {
        Long id = persistGradeSheet().getId();

        GradeSheet found = entityManager.find(GradeSheet.class, id);

        assertThat(found.getDisciplineName()).isEqualTo(DISCIPLINE);
        assertThat(found.getGroup()).isEqualTo(GROUP);
        assertThat(found.getSemester()).isEqualTo(SEMESTER);
        assertThat(found.getDepartment()).isEqualTo("УИТС");
        assertThat(found.getImportedTeachers()).isEqualTo("Чеканин В.А., Ступивцев А.В.");
        assertThat(found.getSubject().getName()).isEqualTo(DISCIPLINE);
        assertThat(found.getTeacher().getLastName()).isEqualTo("Чеканин");
        assertThat(found.getStudents()).hasSize(2);
    }

    @Test
    void importedAtIsFilledOnInsert() {
        Long id = persistGradeSheet().getId();

        assertThat(entityManager.find(GradeSheet.class, id).getImportedAt()).isNotNull();
    }

    @Test
    void studentsComeBackOrderedByNumber() {
        Long id = persistGradeSheet().getId();

        GradeSheet found = entityManager.find(GradeSheet.class, id);

        assertThat(found.getStudents())
                .extracting(GradeSheetStudent::getLastName)
                .containsExactly("Абрамов", "Виноградов");
    }

    @Test
    void studentWithoutPatronymicIsStored() {
        persistGradeSheet();

        assertThat(student("Виноградов").getPatronymic()).isNull();
    }

    @Test
    void marksKeepScoreAndTextApart() {
        persistGradeSheet();

        GradeSheetMark credit = mark("Абрамов", "Зачёт");
        assertThat(credit.getScore()).isEqualByComparingTo("30.00");
        assertThat(credit.getText()).isNull();
        assertThat(credit.getGrade()).isEqualTo("зачтено");
        assertThat(credit.getDate()).isEqualTo(LocalDate.of(2026, 6, 2));

        GradeSheetMark notAdmitted = mark("Виноградов", "Зачёт");
        assertThat(notAdmitted.getScore()).isNull();
        assertThat(notAdmitted.getText()).isEqualTo("не допущен");
    }

    @Test
    void removingStudentFromSheetDeletesStudentAndMarks() {
        Long id = persistGradeSheet().getId();

        GradeSheet found = entityManager.find(GradeSheet.class, id);
        found.getStudents().clear();
        entityManager.flush();

        assertThat(count("gradesheet_student")).isZero();
        assertThat(count("gradesheet_mark")).isZero();
        assertThat(count("gradesheet_gradesheet")).isEqualTo(1);
    }

    @Test
    void deletingGradeSheetDeletesStudentsAndMarks() {
        Long id = persistGradeSheet().getId();

        entityManager.remove(entityManager.find(GradeSheet.class, id));
        entityManager.flush();

        assertThat(count("gradesheet_gradesheet")).isZero();
        assertThat(count("gradesheet_student")).isZero();
        assertThat(count("gradesheet_mark")).isZero();
    }

    @Test
    void deletingTeacherKeepsGradeSheetAndClearsTheLink() {
        persistGradeSheet();

        jdbc.update("delete from employee_teacher where id = ?", teacher.getId());

        assertThat(count("gradesheet_gradesheet")).isEqualTo(1);
        assertThat(count("gradesheet_mark")).isEqualTo(3);
        assertThat(jdbc.queryForObject(
                "select teacher_id from gradesheet_gradesheet", Long.class)).isNull();
    }

    @Test
    void deletingSubjectKeepsGradeSheetAndClearsTheLink() {
        persistGradeSheet();

        jdbc.update("delete from subject_subject where id = ?", subject.getId());

        assertThat(count("gradesheet_gradesheet")).isEqualTo(1);
        assertThat(jdbc.queryForObject(
                "select subject_id from gradesheet_gradesheet", Long.class)).isNull();
    }

    @Test
    void sameDisciplineGroupAndSemesterCannotBeImportedTwice() {
        persistGradeSheet();

        assertThatThrownBy(() -> jdbc.update("""
                insert into gradesheet_gradesheet
                    (discipline_name, "group", semester, imported_at)
                values (?, ?, ?, now())
                """, DISCIPLINE, GROUP, SEMESTER))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("uq_gradesheet_discipline_group_semester");
    }

    @Test
    void anotherGroupOfTheSameDisciplineIsAllowed() {
        persistGradeSheet();

        jdbc.update("""
                insert into gradesheet_gradesheet
                    (discipline_name, "group", semester, imported_at)
                values (?, ?, ?, now())
                """, DISCIPLINE, "ИДБ-25-12", SEMESTER);

        assertThat(count("gradesheet_gradesheet")).isEqualTo(2);
    }

    @Test
    void scoreAndTextTogetherAreRejected() {
        persistGradeSheet();
        Long studentId = student("Абрамов").getId();

        assertThatThrownBy(() -> jdbc.update("""
                insert into gradesheet_mark (student_id, block, score, mark_text)
                values (?, ?, ?, ?)
                """, studentId, "М2", new BigDecimal("25.00"), "не допущен"))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("ck_gradesheet_mark_score_or_text");
    }

    @Test
    void markWithoutAnyValueIsRejected() {
        persistGradeSheet();
        Long studentId = student("Абрамов").getId();

        assertThatThrownBy(() -> jdbc.update("""
                insert into gradesheet_mark (student_id, block) values (?, ?)
                """, studentId, "М2"))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("ck_gradesheet_mark_not_empty");
    }

    private GradeSheetStudent student(String lastName) {
        List<GradeSheetStudent> found = entityManager.createQuery(
                        "select s from GradeSheetStudent s where s.lastName = :lastName",
                        GradeSheetStudent.class)
                .setParameter("lastName", lastName)
                .getResultList();
        assertThat(found).hasSize(1);
        return found.getFirst();
    }

    private GradeSheetMark mark(String lastName, String block) {
        List<GradeSheetMark> found = entityManager.createQuery("""
                        select m from GradeSheetMark m
                        where m.student.lastName = :lastName and m.block = :block
                        """, GradeSheetMark.class)
                .setParameter("lastName", lastName)
                .setParameter("block", block)
                .getResultList();
        assertThat(found).hasSize(1);
        return found.getFirst();
    }

    private int count(String table) {
        return jdbc.queryForObject("select count(*) from " + table, Integer.class);
    }
}
