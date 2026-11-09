package ru.stankin.uits.module.publications.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "scientific_publications_tag")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Tag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", length = 100, nullable = false, unique = true)
    private String name;
}
