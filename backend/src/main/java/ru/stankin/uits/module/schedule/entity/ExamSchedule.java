package ru.stankin.uits.module.schedule.entity;

import jakarta.persistence.*;
import lombok.*;
import ru.stankin.uits.module.staff.entity.Teacher;

import java.util.LinkedHashSet;
import java.util.Set;

@Entity
@Table(name = "schedule_examschedule")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExamSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "teacher_id", unique = true, nullable = false)
    private Teacher teacher;

    @Column(name = "imported_file_name", length = 256)
    private String importedFileName;

    @Builder.Default
    @OneToMany(mappedBy = "examSchedule", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("examDate, timeStart, id")
    private Set<Exam> exams = new LinkedHashSet<>();

    public void addExam(Exam exam) {
        exams.add(exam);
        exam.setExamSchedule(this);
    }
}
