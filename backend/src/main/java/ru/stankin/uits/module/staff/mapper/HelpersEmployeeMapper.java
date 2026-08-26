package ru.stankin.uits.module.staff.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;
import org.springframework.beans.factory.annotation.Autowired;
import ru.stankin.uits.common.storage.FileStorage;
import ru.stankin.uits.module.staff.dto.HelpersEmployeeRequestDto;
import ru.stankin.uits.module.staff.dto.HelpersEmployeeResponseDto;
import ru.stankin.uits.module.staff.entity.HelpersEmployee;

@Mapper(componentModel = "spring")
public abstract class HelpersEmployeeMapper {

    @Autowired
    protected FileStorage fileStorage;

    @Mapping(target = "avatarUrl", source = "avatar", qualifiedByName = "avatarUrl")
    public abstract HelpersEmployeeResponseDto toDto(HelpersEmployee employee);

    @Mapping(target = "id", ignore = true)
    public abstract HelpersEmployee toEntity(HelpersEmployeeRequestDto dto);

    @Mapping(target = "id", ignore = true)
    public abstract void updateEntity(@MappingTarget HelpersEmployee employee, HelpersEmployeeRequestDto dto);

    @Named("avatarUrl")
    public String avatarUrl(String key) {
        if (key == null) {
            return null;
        } else {
            return fileStorage.url(key);
        }
    }
}
