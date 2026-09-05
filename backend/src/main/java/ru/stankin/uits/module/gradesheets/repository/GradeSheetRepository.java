package ru.stankin.uits.module.gradesheets.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import ru.stankin.uits.module.gradesheets.entity.GradeSheet;

import java.util.Optional;

public interface GradeSheetRepository extends JpaRepository<GradeSheet, Long> {

    @EntityGraph(attributePaths = {"teacher", "subject", "students", "students.marks"})
    Optional<GradeSheet> findWithStudentsById(Long id);

    Optional<GradeSheet> findByDisciplineNameAndGroupAndSemester(
            String disciplineName, String group, String semester);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<GradeSheet> findWithLockByDisciplineNameAndGroupAndSemester(
            String disciplineName, String group, String semester);

    @Query(value = """
            select g.id as id,
                   g.disciplineName as discipline,
                   g.group as group,
                   g.semester as semester,
                   g.department as department,
                   g.direction as direction,
                   g.importedTeachers as teachers,
                   size(g.students) as studentCount,
                   g.importedFileName as importedFileName,
                   g.importedAt as importedAt
            from GradeSheet g
            where (:group is null or lower(g.group) = lower(cast(:group as string)))
              and (:discipline is null
                   or lower(g.disciplineName) like lower(concat('%', cast(:discipline as string), '%')) escape '\\')
              and (:semester is null or lower(g.semester) = lower(cast(:semester as string)))
            """,
            countQuery = """
            select count(g)
            from GradeSheet g
            where (:group is null or lower(g.group) = lower(cast(:group as string)))
              and (:discipline is null
                   or lower(g.disciplineName) like lower(concat('%', cast(:discipline as string), '%')) escape '\\')
              and (:semester is null or lower(g.semester) = lower(cast(:semester as string)))
            """)
    Page<GradeSheetSummary> search(@Param("group") String group,
                                   @Param("discipline") String discipline,
                                   @Param("semester") String semester,
                                   Pageable pageable);
}
