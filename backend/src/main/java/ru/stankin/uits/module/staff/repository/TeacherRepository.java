package ru.stankin.uits.module.staff.repository;

import org.jspecify.annotations.NullMarked;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import ru.stankin.uits.module.staff.entity.Teacher;

@NullMarked
public interface TeacherRepository extends JpaRepository<Teacher, Long> {
    @EntityGraph(attributePaths = {"user"})
    Page<Teacher> findAll(Pageable pageable);
}
