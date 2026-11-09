package ru.stankin.uits.module.staff.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SubjectDto {
    private Long id;
    private String name;

    private String description;
}
