package ru.stankin.uits.module.tasks.entity;

import jakarta.persistence.*;
import lombok.*;
import ru.stankin.uits.module.tasks.enums.TaskAssigneeStatus;
import ru.stankin.uits.module.user.entity.User;

import java.time.OffsetDateTime;

@Entity
@Table(
        name = "dept_task_assignee",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_dept_task_assignee_task_user",
                columnNames = {"task_id", "user_id"}
        )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaskAssignee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "task_id", nullable = false)
    private Task task;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20, nullable = false)
    private TaskAssigneeStatus status = TaskAssigneeStatus.OPEN;

    @Column(name = "assigned_at", nullable = false)
    private OffsetDateTime assignedAt;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    @PrePersist
    protected void onCreate() {
        if (assignedAt == null) {
            assignedAt = OffsetDateTime.now();
        }
    }
}
