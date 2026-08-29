package ru.stankin.uits.module.schedule.repository;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import ru.stankin.uits.module.schedule.entity.Schedule;

import java.util.Optional;

public interface ScheduleRepository extends JpaRepository<Schedule, Long> {

    @EntityGraph(attributePaths = {"lessons", "lessons.dates"})
    Optional<Schedule> findByTeacherId(Long teacherId);
}
