package ru.stankin.uits.module.students.entity;

import jakarta.persistence.*;
import lombok.*;
import ru.stankin.uits.module.staff.entity.Teacher;

@Entity
@Table(name = "postgraduate_postgraduate")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Postgraduate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id")
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id")
    private Teacher teacher;
}
