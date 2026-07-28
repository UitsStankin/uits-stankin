package ru.stankin.uits.module.user.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import ru.stankin.uits.module.user.entity.User;

import java.time.OffsetDateTime;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);

    @Modifying
    @Query("update User u set u.lastLogin = :now where u.id = :id")
    void updateLastLogin(Long id, OffsetDateTime now);
}
