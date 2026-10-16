package ru.stankin.uits.module.publications.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;
import org.springframework.beans.factory.annotation.Autowired;
import ru.stankin.uits.common.storage.FileStorage;
import ru.stankin.uits.module.publications.dto.PublicationRequestDto;
import ru.stankin.uits.module.publications.dto.PublicationResponseDto;
import ru.stankin.uits.module.publications.dto.TagDto;
import ru.stankin.uits.module.publications.entity.ScientificPublication;
import ru.stankin.uits.module.publications.entity.Tag;

import java.util.List;
import java.util.Set;

@Mapper(componentModel = "spring")
public abstract class PublicationMapper {

    @Autowired
    protected FileStorage fileStorage;

    @Autowired
    protected TagMapper tagMapper;

    @Mapping(target = "fileUrl", source = "file", qualifiedByName = "fileUrl")
    @Mapping(target = "tags", source = "tags", qualifiedByName = "tagList")
    public abstract PublicationResponseDto toDto(ScientificPublication publication);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "tags", ignore = true)
    public abstract ScientificPublication toEntity(PublicationRequestDto dto);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "tags", ignore = true)
    public abstract void updateEntity(@MappingTarget ScientificPublication publication,
                                      PublicationRequestDto dto);

    @Named("fileUrl")
    public String fileUrl(String key) {
        if (key == null) {
            return null;
        }

        return fileStorage.url(key);
    }

    @Named("tagList")
    public List<TagDto> tagList(Set<Tag> tags) {
        return tags.stream().map(tagMapper::toDto).toList();
    }
}
