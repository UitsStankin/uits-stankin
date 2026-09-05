package ru.stankin.uits.module.gradesheets.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import ru.stankin.uits.module.gradesheets.entity.GradeSheet;

import java.util.List;
import java.util.Optional;

public interface GradeSheetRepository extends JpaRepository<GradeSheet, Long> {

    @EntityGraph(attributePaths = {"teacher", "subject", "students"})
    Optional<GradeSheet> findWithStudentsById(Long id);

    @EntityGraph(attributePaths = {"teacher", "subject"})
    List<GradeSheet> findByTeacherId(Long teacherId, Sort sort);

    @EntityGraph(attributePaths = {"teacher", "subject"})
    List<GradeSheet> findByGroup(String group, Sort sort);

    Optional<GradeSheet> findByDisciplineNameAndGroupAndSemester(
            String disciplineName, String group, String semester);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<GradeSheet> findWithLockByDisciplineNameAndGroupAndSemester(
            String disciplineName, String group, String semester);
}
