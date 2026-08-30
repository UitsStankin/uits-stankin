package ru.stankin.uits.module.publications.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "scientific_publications_scientificpublication")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScientificPublication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", length = 200, nullable = false)
    private String name;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "author", nullable = false)
    @Builder.Default
    private List<String> authors = new ArrayList<>();

    @Column(name = "description", columnDefinition = "TEXT", nullable = false)
    private String description;

    @Column(name = "url", length = 200)
    private String url;

    @Column(name = "file", length = 100)
    private String file;

    @Column(name = "year", nullable = false)
    private Integer year;

    @Column(name = "source", length = 200, nullable = false)
    private String source;

    @Column(name = "pages", length = 50)
    private String pages;

    @Column(name = "vol_n", length = 100)
    private String volN;

    @Column(name = "isbn", length = 20)
    private String isbn;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "scientific_publications_scientificpublication_tags",
            joinColumns = @JoinColumn(name = "scientificpublication_id"),
            inverseJoinColumns = @JoinColumn(name = "tag_id"))
    @OrderBy("name")
    @Builder.Default
    private Set<Tag> tags = new LinkedHashSet<>();
}
