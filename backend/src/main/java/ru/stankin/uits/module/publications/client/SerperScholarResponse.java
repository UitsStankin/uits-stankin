package ru.stankin.uits.module.publications.client;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SerperScholarResponse {
    List<SerperScholarItem> organic;
}
