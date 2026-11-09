package ru.stankin.uits.module.schedule.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "schedule_schedulelessondate")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScheduleLessonDate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "lesson_id", nullable = false)
    private ScheduleLesson lesson;

    @Column(name = "start_date", length = 5, nullable = false)
    private String startDate;

    @Column(name = "end_date", length = 5)
    private String endDate;

    @Builder.Default
    @Column(name = "alternatively_period", nullable = false)
    private boolean alternativelyPeriod = false;
}
