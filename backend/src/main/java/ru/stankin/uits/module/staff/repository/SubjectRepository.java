package ru.stankin.uits.module.staff.repository;

import org.jspecify.annotations.NullMarked;
import org.springframework.data.jpa.repository.JpaRepository;
import ru.stankin.uits.module.staff.entity.Subject;

@NullMarked
public interface SubjectRepository extends JpaRepository<Subject, Long> {
}
