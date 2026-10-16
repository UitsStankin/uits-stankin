package ru.stankin.uits.module.publications.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import ru.stankin.uits.module.publications.client.SerperScholarItem;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "scholar_search_cache")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScholarSearchCache {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "query", length = 200, nullable = false)
    private String query;

    @Column(name = "page", nullable = false)
    private int page;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "response", nullable = false)
    @Builder.Default
    private List<SerperScholarItem> response = new ArrayList<>();

    @Column(name = "fetched_at", nullable = false)
    private OffsetDateTime fetchedAt;
}
