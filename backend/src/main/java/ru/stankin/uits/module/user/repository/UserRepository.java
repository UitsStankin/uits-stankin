package ru.stankin.uits.module.user.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import ru.stankin.uits.module.user.entity.User;

import java.time.OffsetDateTime;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    boolean existsByAvatar(String avatar);
    Optional<User> findByUsername(String username);

    @Modifying
    @Query("update User u set u.lastLogin = :now where u.id = :id")
    void updateLastLogin(Long id, OffsetDateTime now);

    @Query("""
            select u from User u
            where (:q is null
                    or lower(u.username) like lower(concat('%', :q, '%'))
                    or lower(u.firstName) like lower(concat('%', :q, '%'))
                    or lower(u.lastName) like lower(concat('%', :q, '%'))
                    or lower(u.email) like lower(concat('%', :q, '%')))
              and (:active is null or u.active = :active)
              and (:superuser is null or u.superuser = :superuser)
              and (:moderator is null or u.moderator = :moderator)
              and (:teacher is null or u.teacher = :teacher)
            """)
    Page<User> search(
            String q,
            Boolean active,
            Boolean superuser,
            Boolean moderator,
            Boolean teacher,
            Pageable pageable
    );
}
