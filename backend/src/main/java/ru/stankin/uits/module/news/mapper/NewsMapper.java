package ru.stankin.uits.module.news.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import ru.stankin.uits.module.news.dto.NewsRequestDto;
import ru.stankin.uits.module.news.dto.NewsResponseDto;
import ru.stankin.uits.module.news.entity.NewsPost;

@Mapper(componentModel = "spring")
public interface NewsMapper {

    @Mapping(target = "authorName", expression = "java(entity.getAuthor().getFirstName() + ' ' + entity.getAuthor().getLastName())")
    NewsResponseDto toDto(NewsPost entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "author", ignore = true)
    NewsPost toEntity(NewsRequestDto dto);
}