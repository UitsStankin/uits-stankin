package ru.stankin.uits.module.gradesheets.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "gradesheet_mark")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GradeSheetMark {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false)
    private GradeSheetStudent student;

    @Column(name = "block", length = 128, nullable = false)
    private String block;

    @Column(name = "score", precision = 5, scale = 2)
    private BigDecimal score;

    @Column(name = "mark_text", length = 128)
    private String text;

    @Column(name = "grade", length = 128)
    private String grade;

    @Column(name = "mark_date")
    private LocalDate date;

    @Column(name = "teacher_name", length = 128)
    private String teacherName;
}
