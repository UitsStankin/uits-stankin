package ru.stankin.uits.module.tasks.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import ru.stankin.uits.module.tasks.entity.Task;
import ru.stankin.uits.module.tasks.enums.TaskStatus;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface TaskRepository extends JpaRepository<Task, Long> {

    String FILTER = """
            from Task t
            where (
                (:status is not null and t.status = :status)
                or (:status is null and (:archived = true or t.status <> ru.stankin.uits.module.tasks.enums.TaskStatus.ARCHIVED))
            )
              and (:mineUserId is null or exists (
                  select 1 from TaskAssignee ta where ta.task = t and ta.user.id = :mineUserId
              ))
              and (:assigneeId is null or exists (
                  select 1 from TaskAssignee ta2 where ta2.task = t and ta2.user.id = :assigneeId
              ))
              and (cast(:from as date) is null or t.dueDate >= :from)
              and (cast(:to as date) is null or t.startDate <= :to)
              and (:q is null or lower(t.title) like lower(concat('%', cast(:q as string), '%')) escape '\\')
            """;

    @Query(value = "select t " + FILTER, countQuery = "select count(t) " + FILTER)
    Page<Task> findByFilters(
            @Param("status") TaskStatus status,
            @Param("archived") boolean archived,
            @Param("mineUserId") Long mineUserId,
            @Param("assigneeId") Long assigneeId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to,
            @Param("q") String q,
            Pageable pageable
    );

    @EntityGraph(attributePaths = {"author", "assignees", "assignees.user"})
    Optional<Task> findWithDetailsById(Long id);

    @EntityGraph(attributePaths = {"author", "assignees", "assignees.user"})
    List<Task> findWithDetailsByIdIn(Collection<Long> ids);
}
