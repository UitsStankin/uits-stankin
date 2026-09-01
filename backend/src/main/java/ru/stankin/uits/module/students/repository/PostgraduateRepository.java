package ru.stankin.uits.module.students.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import ru.stankin.uits.module.students.entity.Postgraduate;

import java.util.Optional;

public interface PostgraduateRepository extends JpaRepository<Postgraduate, Long> {

    @EntityGraph(attributePaths = {"student", "teacher"})
    Optional<Postgraduate> findWithDetailsById(Long id);

    @EntityGraph(attributePaths = {"student", "teacher"})
    Page<Postgraduate> findAllBy(Pageable pageable);

    @EntityGraph(attributePaths = {"student", "teacher"})
    Page<Postgraduate> findByTeacherId(Long teacherId, Pageable pageable);

    @EntityGraph(attributePaths = {"student", "teacher"})
    Page<Postgraduate> findByStudentSpeciality(String speciality, Pageable pageable);

    @EntityGraph(attributePaths = {"student", "teacher"})
    Page<Postgraduate> findByTeacherIdAndStudentSpeciality(Long teacherId, String speciality, Pageable pageable);
}
