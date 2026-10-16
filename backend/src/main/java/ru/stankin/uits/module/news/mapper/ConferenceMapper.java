package ru.stankin.uits.module.news.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;
import org.springframework.beans.factory.annotation.Autowired;
import ru.stankin.uits.common.storage.FileStorage;
import ru.stankin.uits.module.news.dto.ConferenceRequestDto;
import ru.stankin.uits.module.news.dto.ConferenceResponseDto;
import ru.stankin.uits.module.news.entity.ConferenceAnnouncement;

@Mapper(componentModel = "spring")
public abstract class ConferenceMapper {

    /**
     * Инъекция в поле — как в {@link NewsMapper}: MapStruct генерирует наследника
     * с конструктором без аргументов, и конструкторная инъекция уронила бы сборку.
     */
    @Autowired
    protected FileStorage fileStorage;

    @Mapping(target = "previewImageUrl", source = "previewImage", qualifiedByName = "previewImageUrl")
    public abstract ConferenceResponseDto toDto(ConferenceAnnouncement entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    public abstract ConferenceAnnouncement toEntity(ConferenceRequestDto dto);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    public abstract void updateEntity(@MappingTarget ConferenceAnnouncement entity, ConferenceRequestDto dto);

    @Named("previewImageUrl")
    public String previewImageUrl(String key) {
        if (key == null) {
            return null;
        } else {
            return fileStorage.url(key);
        }
    }
}
