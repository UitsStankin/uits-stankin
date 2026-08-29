package ru.stankin.uits.module.schedule.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "schedule_schedulelesson")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScheduleLesson {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "schedule_id", nullable = false)
    private Schedule schedule;

    @Column(name = "week_number", nullable = false)
    private Integer weekNumber;

    @Column(name = "class_time", nullable = false)
    private Integer classTime;

    @Column(name = "\"group\"", length = 128, nullable = false)
    private String group;

    @Column(name = "name", length = 256, nullable = false)
    private String name;

    @Column(name = "type", length = 128, nullable = false)
    private String type;

    @Column(name = "cabinet", length = 128)
    private String cabinet;

    @Column(name = "subgroup", length = 128)
    private String subgroup;

    @Builder.Default
    @OneToMany(mappedBy = "lesson", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ScheduleLessonDate> dates = new ArrayList<>();

    public void addDate(ScheduleLessonDate date) {
        dates.add(date);
        date.setLesson(this);
    }
}
