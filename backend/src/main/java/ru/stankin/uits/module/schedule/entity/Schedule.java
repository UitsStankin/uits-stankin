package ru.stankin.uits.module.schedule.entity;

import jakarta.persistence.*;
import lombok.*;
import ru.stankin.uits.module.staff.entity.Teacher;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "schedule_schedule")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Schedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "teacher_id", unique = true, nullable = false)
    private Teacher teacher;

    @Column(name = "imported_file_name", length = 256)
    private String importedFileName;

    @Builder.Default
    @OneToMany(mappedBy = "schedule", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ScheduleLesson> lessons = new ArrayList<>();

    public void addLesson(ScheduleLesson lesson) {
        lessons.add(lesson);
        lesson.setSchedule(this);
    }
}
