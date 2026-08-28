package ru.stankin.uits.module.news.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;
import org.springframework.beans.factory.annotation.Autowired;
import ru.stankin.uits.common.storage.FileStorage;
import ru.stankin.uits.module.news.dto.NewsRequestDto;
import ru.stankin.uits.module.news.dto.NewsResponseDto;
import ru.stankin.uits.module.news.entity.NewsPost;
import ru.stankin.uits.module.user.entity.User;

import java.util.stream.Collectors;
import java.util.stream.Stream;

@Mapper(componentModel = "spring")
public abstract class NewsMapper {

    /**
     * Инъекция в поле — вынужденная для мапперов: MapStruct генерирует наследника
     * с конструктором без аргументов, и конструкторная инъекция уронила бы сборку.
     */
    @Autowired
    protected FileStorage fileStorage;

    @Mapping(target = "previewImageUrl", source = "previewImage", qualifiedByName = "previewImageUrl")
    @Mapping(target = "authorName", source = "author", qualifiedByName = "authorName")
    public abstract NewsResponseDto toDto(NewsPost entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "author", ignore = true)
    public abstract NewsPost toEntity(NewsRequestDto dto);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "author", ignore = true)
    public abstract void updateEntity(@MappingTarget NewsPost entity, NewsRequestDto dto);

    @Named("authorName")
    public String authorName(User author) {
        if (author == null) {
            return null;
        }

        String name = Stream.of(author.getFirstName(), author.getLastName())
                .filter(part -> part != null && !part.isBlank())
                .collect(Collectors.joining(" "));

        return name.isEmpty() ? null : name;
    }

    @Named("previewImageUrl")
    public String previewImageUrl(String key) {
        if (key == null) {
            return null;
        } else {
            return fileStorage.url(key);
        }
    }
}