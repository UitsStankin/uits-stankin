package ru.stankin.uits.module.news.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
import ru.stankin.uits.module.news.dto.NewsRequestDto;
import ru.stankin.uits.module.news.dto.NewsResponseDto;
import ru.stankin.uits.module.news.entity.NewsPost;
import ru.stankin.uits.module.user.entity.User;

import java.util.stream.Collectors;
import java.util.stream.Stream;

@Mapper(componentModel = "spring")
public interface NewsMapper {

    @Mapping(target = "authorName", source = "author", qualifiedByName = "authorName")
    NewsResponseDto toDto(NewsPost entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "author", ignore = true)
    NewsPost toEntity(NewsRequestDto dto);

    @Named("authorName")
    default String authorName(User author) {
        if (author == null) {
            return null;
        } else {
            return Stream.of(author.getFirstName(), author.getLastName())
                    .filter(part -> part != null && !part.isBlank())
                    .collect(Collectors.joining(" "));
        }
    }
}