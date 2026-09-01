package ru.stankin.uits.module.staff.repository;

import org.jspecify.annotations.NullMarked;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import ru.stankin.uits.module.staff.entity.Teacher;

import java.util.List;
import java.util.Optional;

@NullMarked
public interface TeacherRepository extends JpaRepository<Teacher, Long> {

    boolean existsByAvatar(String avatar);
    Optional<Teacher> findByUserUsername(String username);
    Optional<Teacher> findByUserId(Long userId);

    @Query("""
            select t from Teacher t
            where length(coalesce(t.examScheduleGraduation, '')) > 0
               or length(coalesce(t.examScheduleNonGraduation, '')) > 0
            """)
    List<Teacher> findWithExamSchedule(Sort sort);

    @Query("""
            select t from Teacher t
            where length(coalesce(t.examScheduleGraduation, '')) > 0
            """)
    List<Teacher> findWithGraduationExamSchedule(Sort sort);

    @Query("""
            select t from Teacher t
            where length(coalesce(t.examScheduleNonGraduation, '')) > 0
            """)
    List<Teacher> findWithNonGraduationExamSchedule(Sort sort);
}
