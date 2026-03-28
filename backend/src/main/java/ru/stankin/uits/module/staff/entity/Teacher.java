package ru.stankin.uits.module.staff.entity;

import jakarta.persistence.*;
import lombok.*;
import ru.stankin.uits.module.user.entity.User;

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
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "degree", length = 100)
    private String degree;

    @Column(name = "rank", length = 100)
    private String rank;

    @Column(name = "position", length = 100)
    private String position;

    @Column(name = "bio", columnDefinition = "TEXT")
    private String bio;

    @Column(name = "phone_number", length = 50)
    private String phoneNumber;

    @Column(name = "education", columnDefinition = "TEXT")
    private String education;

    @Column(name = "qualification", columnDefinition = "TEXT")
    private String qualification;

    @Column(name = "professional_experience")
    private Integer professionalExperience;
}