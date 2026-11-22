package ru.stankin.uits.module.events.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import ru.stankin.uits.module.events.entity.UserEvent;
import ru.stankin.uits.module.events.enums.EventStatus;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface UserEventRepository extends JpaRepository<UserEvent, Long> {

    // Cast задаёт PostgreSQL тип nullable-параметра в IS NULL; сами даты сравниваются с часовым смещением.
    String VISIBLE_TO = """
            from UserEvent e
            left join e.assignedUsers a
            where (e.owner.id = :userId or a.id = :userId)
              and (:status is null or e.status = :status)
              and (cast(:from as timestamp) is null or e.endedAt >= :from)
              and (cast(:to as timestamp) is null or e.startedAt < :to)
            """;

    @Query(value = "select distinct e " + VISIBLE_TO,
            countQuery = "select count(distinct e) " + VISIBLE_TO)
    Page<UserEvent> findVisibleTo(@Param("userId") Long userId,
                                  @Param("status") EventStatus status,
                                  @Param("from") OffsetDateTime from,
                                  @Param("to") OffsetDateTime to,
                                  Pageable pageable);

    @EntityGraph(attributePaths = {"owner", "assignedUsers"})
    Optional<UserEvent> findWithDetailsById(Long id);

    @EntityGraph(attributePaths = {"owner", "assignedUsers"})
    List<UserEvent> findWithDetailsByIdIn(Collection<Long> ids);
}
