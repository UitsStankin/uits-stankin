package ru.stankin.uits.module.publications.mapper;

import org.mapstruct.Mapper;
import ru.stankin.uits.module.publications.dto.TagDto;
import ru.stankin.uits.module.publications.entity.Tag;

@Mapper(componentModel = "spring")
public interface TagMapper {

    TagDto toDto(Tag tag);
}
