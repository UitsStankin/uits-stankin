package ru.stankin.uits.module.news.entity;

import jakarta.persistence.*;
import lombok.*;
import ru.stankin.uits.module.user.entity.User;

import java.time.OffsetDateTime;

@Entity
@Table(name = "news_post")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NewsPost {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "title", length = 100, nullable = false)
    private String title;

    @Column(name = "short_description", columnDefinition = "TEXT")
    private String shortDescription;

    // 'news' or 'announcements'
    @Column(name = "post_type", length = 20, nullable = false)
    private String postType;

    @Column(name = "preview_image", length = 100)
    private String previewImage;

    @Column(name = "preview_thumbnail", length = 100)
    private String previewThumbnail;

    @Column(name = "preview_image_description", length = 256)
    private String previewImageDescription;

    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Builder.Default
    @Column(name = "display", nullable = false)
    private boolean display = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }
}