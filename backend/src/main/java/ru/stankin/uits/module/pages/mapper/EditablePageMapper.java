package ru.stankin.uits.module.pages.mapper;

import org.mapstruct.Mapper;
import ru.stankin.uits.module.pages.dto.EditablePageResponseDto;
import ru.stankin.uits.module.pages.entity.EditablePage;

@Mapper(componentModel = "spring")
public interface EditablePageMapper {
    EditablePageResponseDto toDto(EditablePage entity);
}
