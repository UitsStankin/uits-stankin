package ru.stankin.uits.module.events.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventUserDto {
    Long id;
    String firstName;
    String lastName;
}
