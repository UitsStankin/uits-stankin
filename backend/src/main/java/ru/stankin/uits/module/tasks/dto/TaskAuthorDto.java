package ru.stankin.uits.module.tasks.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskAuthorDto {
    private Long id;
    private String firstName;
    private String lastName;
}
