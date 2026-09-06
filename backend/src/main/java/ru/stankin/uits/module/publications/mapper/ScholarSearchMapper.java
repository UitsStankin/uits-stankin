package ru.stankin.uits.module.publications.mapper;

import org.mapstruct.Mapper;
import ru.stankin.uits.module.publications.client.SerperScholarItem;
import ru.stankin.uits.module.publications.dto.ScholarSearchItemDto;

import java.util.List;

@Mapper(componentModel = "spring")
public interface ScholarSearchMapper {

    ScholarSearchItemDto toDto(SerperScholarItem item);

    List<ScholarSearchItemDto> toDtos(List<SerperScholarItem> items);
}
