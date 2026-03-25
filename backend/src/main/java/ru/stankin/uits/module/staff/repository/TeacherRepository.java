package ru.stankin.uits.module.staff.repository;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import ru.stankin.uits.module.staff.entity.Teacher;

import java.util.List;
import java.util.Optional;

public interface TeacherRepository extends JpaRepository<Teacher, Long> {
    Optional<Teacher> findByUserId(Long userId);

    @EntityGraph(attributePaths = {"user"})
    List<Teacher> findAll();
}
