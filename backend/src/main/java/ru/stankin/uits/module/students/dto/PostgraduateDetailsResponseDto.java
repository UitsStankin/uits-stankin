package ru.stankin.uits.module.students.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PostgraduateDetailsResponseDto {
    Long id;
    StudentResponseDto student;
    Long teacherId;
}
