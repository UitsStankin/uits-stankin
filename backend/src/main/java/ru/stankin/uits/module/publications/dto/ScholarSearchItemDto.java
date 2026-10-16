package ru.stankin.uits.module.publications.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScholarSearchItemDto {
    String id;
    String title;
    String link;
    String snippet;
    String publicationInfo;
    Integer year;
    Integer citedBy;
    String pdfUrl;
}
