package ru.stankin.uits.module.schedule.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "schedule_exam")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Exam {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "exam_schedule_id", nullable = false)
    private ExamSchedule examSchedule;

    @Column(name = "exam_date", nullable = false)
    private LocalDate examDate;

    @Column(name = "time_start", nullable = false)
    private LocalTime timeStart;

    @Column(name = "time_end", nullable = false)
    private LocalTime timeEnd;

    @Column(name = "\"group\"", length = 128, nullable = false)
    private String group;

    @Column(name = "name", length = 256, nullable = false)
    private String name;

    @Column(name = "cabinet", length = 128, nullable = false)
    private String cabinet;

    @Embedded
    private Consultation consultation;
}
