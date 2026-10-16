package ru.stankin.uits.module.staff.repository;

import org.jspecify.annotations.NullMarked;
import org.springframework.data.jpa.repository.JpaRepository;
import ru.stankin.uits.module.staff.entity.HelpersEmployee;

@NullMarked
public interface HelpersEmployeeRepository extends JpaRepository<HelpersEmployee, Long> {

    boolean existsByAvatar(String avatar);
}
