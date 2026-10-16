package ru.stankin.uits.module.events.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import ru.stankin.uits.module.events.entity.UserEvent;
import ru.stankin.uits.module.events.enums.EventStatus;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface UserEventRepository extends JpaRepository<UserEvent, Long> {

    String VISIBLE_TO = """
            from UserEvent e
            left join e.assignedUsers a
            where (e.owner.id = :userId or a.id = :userId)
              and (:status is null or e.status = :status)
            """;

    @Query(value = "select distinct e " + VISIBLE_TO,
            countQuery = "select count(distinct e) " + VISIBLE_TO)
    Page<UserEvent> findVisibleTo(@Param("userId") Long userId,
                                  @Param("status") EventStatus status,
                                  Pageable pageable);

    @EntityGraph(attributePaths = {"owner", "assignedUsers"})
    Optional<UserEvent> findWithDetailsById(Long id);

    @EntityGraph(attributePaths = {"owner", "assignedUsers"})
    List<UserEvent> findWithDetailsByIdIn(Collection<Long> ids);
}
