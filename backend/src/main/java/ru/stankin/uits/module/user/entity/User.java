package ru.stankin.uits.module.user.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "users_user") // старое название таблицы
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "username", length = 150, unique = true, nullable = false)
    private String username;

    @Column(name = "password", length = 128, nullable = false)
    private String password;

    @Column(name = "first_name", length = 150)
    private String firstName;

    @Column(name = "last_name", length = 150)
    private String lastName;

    @Column(name = "email", length = 254)
    private String email;

    @Column(name = "avatar", length = 100)
    private String avatar;

    @Column(name = "telegram_code", length = 12)
    private String telegramCode;

    // --- Ролевая модель из Django ---

    @Builder.Default
    @Column(name = "is_superuser", nullable = false)
    private boolean superuser = false;

    @Builder.Default
    @Column(name = "is_staff", nullable = false)
    private boolean staff = false; // Доступ в админку

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Builder.Default
    @Column(name = "is_moderator", nullable = false)
    private boolean moderator = false;

    @Builder.Default
    @Column(name = "is_teacher", nullable = false)
    private boolean teacher = false;

    // --- Временные метки ---

    // В Postgres тип "timestamp with time zone" мапится в Java на OffsetDateTime
    @Column(name = "last_login")
    private OffsetDateTime lastLogin;

    @Column(name = "date_joined", nullable = false, updatable = false)
    private OffsetDateTime dateJoined;

    @PrePersist
    protected void onCreate() {
        if (dateJoined == null) {
            dateJoined = OffsetDateTime.now();
        }
    }
}