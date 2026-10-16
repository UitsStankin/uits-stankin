package ru.stankin.uits.module.publications.client;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SerperScholarItem {
    String title;
    String link;
    String publicationInfo;
    String snippet;
    Integer year;
    Integer citedBy;
    String id;
    String pdfUrl;
}
