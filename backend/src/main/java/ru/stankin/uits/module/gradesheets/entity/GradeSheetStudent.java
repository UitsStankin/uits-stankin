package ru.stankin.uits.module.gradesheets.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.LinkedHashSet;
import java.util.Set;

@Entity
@Table(name = "gradesheet_student")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GradeSheetStudent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "gradesheet_id", nullable = false)
    private GradeSheet gradeSheet;

    @Column(name = "student_number")
    private Integer studentNumber;

    @Column(name = "last_name", length = 50, nullable = false)
    private String lastName;

    @Column(name = "first_name", length = 50)
    private String firstName;

    @Column(name = "patronymic", length = 50)
    private String patronymic;

    @Builder.Default
    @OneToMany(mappedBy = "student", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id")
    private Set<GradeSheetMark> marks = new LinkedHashSet<>();

    public void addMark(GradeSheetMark mark) {
        marks.add(mark);
        mark.setStudent(this);
    }
}
