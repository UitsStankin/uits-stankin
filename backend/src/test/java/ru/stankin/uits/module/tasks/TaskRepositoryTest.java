package ru.stankin.uits.module.tasks;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.transaction.annotation.Transactional;
import ru.stankin.uits.AbstractIntegrationTest;
import ru.stankin.uits.TestRole;
import ru.stankin.uits.common.SearchText;
import ru.stankin.uits.module.tasks.entity.Task;
import ru.stankin.uits.module.tasks.entity.TaskAssignee;
import ru.stankin.uits.module.tasks.enums.TaskStatus;
import ru.stankin.uits.module.tasks.repository.TaskRepository;
import ru.stankin.uits.module.user.entity.User;

import java.time.LocalDate;
import java.time.OffsetDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@Transactional
class TaskRepositoryTest extends AbstractIntegrationTest {

    private static final Pageable DEFAULT_PAGE = PageRequest.of(0, 50, Sort.by("dueDate", "id"));

    @Autowired
    private TaskRepository taskRepository;

    private User author;
    private User staff1;
    private User staff2;

    @BeforeEach
    void setUp() {
        author = createUser("repo_author", TestRole.TEACHER);
        staff1 = createUser("repo_staff1", TestRole.USER);
        staff2 = createUser("repo_staff2", TestRole.TEACHER);
    }

    private Task saveTask(String title, TaskStatus status, LocalDate start, LocalDate due, User... assignees) {
        Task task = Task.builder()
                .title(title)
                .status(status)
                .startDate(start)
                .dueDate(due)
                .author(author)
                .archivedAt(status == TaskStatus.ARCHIVED ? OffsetDateTime.now() : null)
                .build();
        for (User user : assignees) {
            task.getAssignees().add(TaskAssignee.builder()
                    .task(task)
                    .user(user)
                    .assignedAt(OffsetDateTime.now())
                    .build());
        }
        return taskRepository.save(task);
    }

    @Test
    void excludesArchivedByDefaultUnlessArchivedTrueOrStatusArchived() {
        saveTask("Активная", TaskStatus.OPEN, LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 10), staff1);
        saveTask("Архивная", TaskStatus.ARCHIVED, LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 5), staff1);

        assertThat(taskRepository.findByFilters(null, false, null, null, null, null, null, DEFAULT_PAGE))
                .extracting(Task::getTitle)
                .containsExactly("Активная");

        assertThat(taskRepository.findByFilters(null, true, null, null, null, null, null, DEFAULT_PAGE))
                .extracting(Task::getTitle)
                .containsExactly("Архивная", "Активная");

        assertThat(taskRepository.findByFilters(TaskStatus.ARCHIVED, false, null, null, null, null, null, DEFAULT_PAGE))
                .extracting(Task::getTitle)
                .containsExactly("Архивная");
    }

    @Test
    void filtersByMineAssigneeDateOverlapAndEscapedLikeQuery() {
        saveTask("100%_отчёт", TaskStatus.OPEN, LocalDate.of(2026, 11, 5), LocalDate.of(2026, 11, 15), staff1, staff2);
        saveTask("1000_другое", TaskStatus.OPEN, LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 4), staff2);
        saveTask("Позже окна", TaskStatus.IN_PROGRESS, LocalDate.of(2026, 11, 20), LocalDate.of(2026, 11, 25), staff1);

        Page<Task> mine = taskRepository.findByFilters(
                null, false, staff1.getId(), null,
                LocalDate.of(2026, 11, 10), LocalDate.of(2026, 11, 16),
                SearchText.escapeLike("100%_"),
                DEFAULT_PAGE
        );

        assertThat(mine.getTotalElements()).isEqualTo(1);
        assertThat(mine.getContent()).extracting(Task::getTitle).containsExactly("100%_отчёт");
    }
}
