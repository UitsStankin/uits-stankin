package ru.stankin.uits.module.students.entity;

import jakarta.persistence.*;
import lombok.*;
import ru.stankin.uits.module.students.enums.EducationLevel;

@Entity
@Table(name = "guidance_student")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Student {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "last_name", length = 50, nullable = false)
    private String lastName;

    @Column(name = "first_name", length = 50, nullable = false)
    private String firstName;

    @Column(name = "patronymic", length = 50)
    private String patronymic;

    @Column(name = "\"group\"", length = 16, nullable = false)
    private String group;

    @Enumerated(EnumType.STRING)
    @Column(name = "education_level", length = 50, nullable = false)
    private EducationLevel educationLevel;

    @Column(name = "speciality", length = 100)
    private String speciality;

    @Column(name = "diploma_theme", columnDefinition = "TEXT")
    private String diplomaTheme;

    @Column(name = "admission_year", nullable = false)
    private Integer admissionYear;
}
