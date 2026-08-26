package ru.stankin.uits.module.staff.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "employee_helpersemployee")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HelpersEmployee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "last_name", length = 150, nullable = false)
    private String lastName;

    @Column(name = "first_name", length = 150, nullable = false)
    private String firstName;

    @Column(name = "patronymic", length = 150)
    private String patronymic;

    @Column(name = "position", length = 100, nullable = false)
    private String position;

    @Column(name = "avatar", length = 100)
    private String avatar;
}
