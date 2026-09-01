package ru.stankin.uits.module.schedule.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Consultation {

    @Column(name = "consultation_date")
    private LocalDate date;

    @Column(name = "consultation_time")
    private LocalTime time;

    @Column(name = "consultation_cabinet", length = 128)
    private String cabinet;
}
