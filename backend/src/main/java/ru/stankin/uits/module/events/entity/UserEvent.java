package ru.stankin.uits.module.events.entity;

import jakarta.persistence.*;
import lombok.*;
import ru.stankin.uits.module.events.enums.EventStatus;
import ru.stankin.uits.module.events.enums.NotificationFrequency;
import ru.stankin.uits.module.user.entity.User;

import java.time.OffsetDateTime;
import java.util.LinkedHashSet;
import java.util.Set;

@Entity
@Table(name = "events_userevent")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", length = 200, nullable = false)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "started_at", nullable = false)
    private OffsetDateTime startedAt;

    @Column(name = "ended_at", nullable = false)
    private OffsetDateTime endedAt;

    @Builder.Default
    @Column(name = "all_day", nullable = false)
    private boolean allDay = false;

    @Builder.Default
    @Column(name = "color", length = 7, nullable = false)
    private String color = "#000000";

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User owner;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "events_userevent_assigned_users",
            joinColumns = @JoinColumn(name = "userevent_id"),
            inverseJoinColumns = @JoinColumn(name = "user_id"))
    @OrderBy("lastName, firstName, id")
    @Builder.Default
    private Set<User> assignedUsers = new LinkedHashSet<>();

    @Builder.Default
    @Column(name = "start_notified", nullable = false)
    private boolean startNotified = false;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "notification_frequency", length = 10, nullable = false)
    private NotificationFrequency notificationFrequency = NotificationFrequency.NONE;

    @Column(name = "next_notification_at")
    private OffsetDateTime nextNotificationAt;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20, nullable = false)
    private EventStatus status = EventStatus.NOT_STARTED;
}
