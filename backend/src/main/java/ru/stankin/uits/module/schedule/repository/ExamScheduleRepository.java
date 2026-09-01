package ru.stankin.uits.module.schedule.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import ru.stankin.uits.module.schedule.entity.ExamSchedule;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ExamScheduleRepository extends JpaRepository<ExamSchedule, Long> {

    @EntityGraph(attributePaths = {"teacher", "exams"})
    Optional<ExamSchedule> findByTeacherId(Long teacherId);

    @EntityGraph(attributePaths = {"teacher", "exams"})
    List<ExamSchedule> findAllBy(Sort sort);

    @EntityGraph(attributePaths = {"teacher", "exams"})
    List<ExamSchedule> findByTeacherIdIn(Collection<Long> teacherIds, Sort sort);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<ExamSchedule> findWithLockByTeacherId(Long teacherId);
}
