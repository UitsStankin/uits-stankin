package ru.stankin.uits.module.staff.repository;

import org.jspecify.annotations.NullMarked;
import org.springframework.data.jpa.repository.JpaRepository;
import ru.stankin.uits.module.staff.entity.Teacher;

import java.util.Optional;

@NullMarked
public interface TeacherRepository extends JpaRepository<Teacher, Long> {
    Optional<Teacher> findByUserUsername(String username);
}
