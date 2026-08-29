package ru.stankin.uits.module.schedule.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import ru.stankin.uits.module.schedule.entity.Schedule;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ScheduleRepository extends JpaRepository<Schedule, Long> {

    @EntityGraph(attributePaths = {"teacher", "lessons", "lessons.dates"})
    Optional<Schedule> findByTeacherId(Long teacherId);

    @EntityGraph(attributePaths = {"teacher", "lessons", "lessons.dates"})
    List<Schedule> findAllBy(Sort sort);

    @EntityGraph(attributePaths = {"teacher", "lessons", "lessons.dates"})
    List<Schedule> findByTeacherIdIn(Collection<Long> teacherIds, Sort sort);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Schedule> findWithLockByTeacherId(Long teacherId);
}
