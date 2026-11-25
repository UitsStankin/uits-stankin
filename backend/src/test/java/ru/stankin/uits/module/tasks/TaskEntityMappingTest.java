package ru.stankin.uits.module.tasks;

import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import ru.stankin.uits.AbstractIntegrationTest;
import ru.stankin.uits.TestRole;
import ru.stankin.uits.module.tasks.entity.Task;
import ru.stankin.uits.module.tasks.entity.TaskAssignee;
import ru.stankin.uits.module.tasks.enums.TaskAssigneeStatus;
import ru.stankin.uits.module.tasks.enums.TaskPriority;
import ru.stankin.uits.module.tasks.enums.TaskStatus;
import ru.stankin.uits.module.tasks.enums.TaskTargetScope;
import ru.stankin.uits.module.tasks.repository.TaskRepository;
import ru.stankin.uits.module.user.entity.User;

import java.time.LocalDate;
import java.time.OffsetDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Transactional
class TaskEntityMappingTest extends AbstractIntegrationTest {

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private JdbcTemplate jdbc;

    private User author;
    private User assignee;

    @BeforeEach
    void setUp() {
        author = createUser("task_map_author", TestRole.TEACHER);
        assignee = createUser("task_map_assignee", TestRole.USER);
    }

    @Test
    void taskAndAssigneesAreStoredWithEnumsAndConstraints() {
        Task task = Task.builder()
                .title("Прохождение опроса")
                .description("https://forms.yandex.ru/example")
                .status(TaskStatus.IN_PROGRESS)
                .priority(TaskPriority.HIGH)
                .targetScope(TaskTargetScope.ALL_TEACHERS)
                .audienceLabel("Все ППС")
                .startDate(LocalDate.of(2026, 11, 12))
                .dueDate(LocalDate.of(2026, 11, 27))
                .author(author)
                .build();
        task.getAssignees().add(TaskAssignee.builder()
                .task(task)
                .user(assignee)
                .status(TaskAssigneeStatus.IN_PROGRESS)
                .assignedAt(OffsetDateTime.now())
                .build());

        Task saved = taskRepository.saveAndFlush(task);
        entityManager.clear();

        Task stored = taskRepository.findWithDetailsById(saved.getId()).orElseThrow();
        assertThat(stored.getTitle()).isEqualTo("Прохождение опроса");
        assertThat(stored.getStatus()).isEqualTo(TaskStatus.IN_PROGRESS);
        assertThat(stored.getPriority()).isEqualTo(TaskPriority.HIGH);
        assertThat(stored.getTargetScope()).isEqualTo(TaskTargetScope.ALL_TEACHERS);
        assertThat(stored.getAssignees()).hasSize(1);

        assertThat(jdbc.queryForObject("select status from dept_task where id = ?", String.class, saved.getId()))
                .isEqualTo("IN_PROGRESS");
        assertThat(jdbc.queryForObject("select priority from dept_task where id = ?", String.class, saved.getId()))
                .isEqualTo("HIGH");

        assertThat(jdbc.update(
                "insert into dept_task_assignee (task_id, user_id, status, assigned_at) values (?, ?, 'OPEN', now()) on conflict do nothing",
                saved.getId(), assignee.getId())).isZero();
    }

    @Test
    void deletingTaskCascadesToAssigneesAndKeepsUsers() {
        Task task = Task.builder()
                .title("Удаляемая")
                .startDate(LocalDate.of(2026, 11, 12))
                .dueDate(LocalDate.of(2026, 11, 12))
                .author(author)
                .build();
        task.getAssignees().add(TaskAssignee.builder()
                .task(task)
                .user(assignee)
                .assignedAt(OffsetDateTime.now())
                .build());
        Task saved = taskRepository.saveAndFlush(task);

        taskRepository.delete(saved);
        entityManager.flush();

        assertThat(jdbc.queryForObject("select count(*) from dept_task_assignee where task_id = ?", Long.class, saved.getId()))
                .isZero();
        assertThat(userRepository.findById(assignee.getId())).isPresent();
    }

    @Test
    void databaseRejectsDueDateBeforeStartDate() {
        assertThatThrownBy(() -> jdbc.update(
                "insert into dept_task (title, status, priority, target_scope, start_date, due_date, author_id, created_at, updated_at) "
                        + "values ('Плохие даты', 'OPEN', 'NORMAL', 'CUSTOM', '2026-11-20', '2026-11-19', ?, now(), now())",
                author.getId()))
                .isNotNull();
    }
}
