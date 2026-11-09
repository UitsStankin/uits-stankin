package ru.stankin.uits.module.auth.entity;

import jakarta.persistence.*;
import lombok.*;
import ru.stankin.uits.module.user.entity.User;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "refresh_token")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "token_hash", length = 64, nullable = false, unique = true, updatable = false)
    private String tokenHash;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, updatable = false)
    private User user;

    @Column(name = "family_id", nullable = false, updatable = false)
    private UUID familyId;

    @Column(name = "parent_id", updatable = false)
    private Long parentId;

    @Column(name = "family_created_at", nullable = false, updatable = false)
    private OffsetDateTime familyCreatedAt;

    @Column(name = "issued_at", nullable = false, updatable = false)
    private OffsetDateTime issuedAt;

    @Column(name = "expires_at", nullable = false, updatable = false)
    private OffsetDateTime expiresAt;

    @Column(name = "used_at")
    private OffsetDateTime usedAt;

    @Column(name = "revoked_at")
    private OffsetDateTime revokedAt;
}
