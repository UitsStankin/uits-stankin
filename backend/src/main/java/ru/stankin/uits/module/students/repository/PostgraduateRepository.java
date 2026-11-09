package ru.stankin.uits.module.students.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import ru.stankin.uits.module.students.entity.Postgraduate;

import java.util.Optional;

public interface PostgraduateRepository extends JpaRepository<Postgraduate, Long> {

    @EntityGraph(attributePaths = {"student", "teacher"})
    Optional<Postgraduate> findWithDetailsById(Long id);

    @EntityGraph(attributePaths = {"student", "teacher"})
    @Query("""
            select p from Postgraduate p
            left join p.student s
            left join p.teacher t
            where (:teacherId is null or t.id = :teacherId)
              and (:speciality is null or s.speciality = :speciality)
              and (:q is null or lower(concat(
                        coalesce(s.lastName, ''), ' ',
                        coalesce(s.firstName, ''), ' ',
                        coalesce(s.patronymic, ''), ' ',
                        coalesce(s.diplomaTheme, ''), ' ',
                        coalesce(s.speciality, ''), ' ',
                        coalesce(cast(s.admissionYear as string), ''), ' ',
                        coalesce(t.lastName, ''), ' ',
                        coalesce(t.firstName, ''), ' ',
                        coalesce(t.patronymic, '')))
                   like lower(concat('%', cast(:q as string), '%')) escape '\\')
            """)
    Page<Postgraduate> search(String q, Long teacherId, String speciality, Pageable pageable);
}
