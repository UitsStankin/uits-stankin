package ru.stankin.uits.module.user.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.stankin.uits.module.user.entity.User;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    // Поиск при логине (for Spring Security)
    Optional<User> findByUsername(String username);

    // Проверка существования пользователя
    boolean existsByUsername(String username);
}
