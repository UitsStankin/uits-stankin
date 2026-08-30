package ru.stankin.uits.module.publications.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicationResponseDto {
    Long id;
    String name;
    List<String> authors;
    String description;
    String url;
    String file;
    String fileUrl;
    Integer year;
    String source;
    String pages;
    String volN;
    String isbn;
    List<TagDto> tags;
}
