package ru.stankin.uits.module.staff.entity;

import jakarta.persistence.*;
import lombok.*;
import ru.stankin.uits.module.staff.enums.TeacherDegree;
import ru.stankin.uits.module.staff.enums.TeacherRank;
import ru.stankin.uits.module.user.entity.User;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "employee_teacher")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Teacher {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", unique = true)
    private User user;

    @Column(name = "last_name", length = 150, nullable = false)
    private String lastName;

    @Column(name = "first_name", length = 150, nullable = false)
    private String firstName;

    @Column(name = "patronymic", length = 150)
    private String patronymic;

    @Column(name = "avatar", length = 100)
    private String avatar;

    @Enumerated(EnumType.STRING)
    @Column(name = "degree", length = 100)
    private TeacherDegree degree;

    @Enumerated(EnumType.STRING)
    @Column(name = "rank", length = 100)
    private TeacherRank rank;

    @Column(name = "position", length = 100)
    private String position;

    @Column(name = "bio", columnDefinition = "TEXT")
    private String bio;

    @Column(name = "phone_number", length = 50)
    private String phoneNumber;

    @Column(name = "email", length = 254)
    private String email;

    @Column(name = "messenger", length = 50)
    private String messenger;

    @Column(name = "education", columnDefinition = "TEXT")
    private String education;

    @Column(name = "qualification", columnDefinition = "TEXT")
    private String qualification;

    @Column(name = "experience")
    private Integer experience;

    @Column(name = "professional_experience")
    private Integer professionalExperience;

    @Column(name = "exam_schedule_graduation", length = 200)
    private String examScheduleGraduation;

    @Column(name = "exam_schedule_non_graduation", length = 200)
    private String examScheduleNonGraduation;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "employee_teacher_subjects",
            joinColumns = @JoinColumn(name = "teacher_id"),
            inverseJoinColumns = @JoinColumn(name = "subject_id"))
    @OrderBy("name")
    @Builder.Default
    private Set<Subject> subjects = new HashSet<>();
}