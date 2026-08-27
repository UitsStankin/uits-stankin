package ru.stankin.uits.module.user.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;
import org.springframework.beans.factory.annotation.Autowired;
import ru.stankin.uits.common.storage.FileStorage;
import ru.stankin.uits.module.user.dto.UserResponseDto;
import ru.stankin.uits.module.user.dto.UserUpdateRequestDto;
import ru.stankin.uits.module.user.entity.User;

@Mapper(componentModel = "spring")
public abstract class UserMapper {

    @Autowired
    protected FileStorage fileStorage;

    @Mapping(target = "avatarUrl", source = "avatar", qualifiedByName = "avatarUrl")
    public abstract UserResponseDto toDto(User user);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "username", ignore = true)
    @Mapping(target = "password", ignore = true)
    @Mapping(target = "email", ignore = true)
    @Mapping(target = "telegramCode", ignore = true)
    @Mapping(target = "superuser", ignore = true)
    @Mapping(target = "staff", ignore = true)
    @Mapping(target = "active", ignore = true)
    @Mapping(target = "moderator", ignore = true)
    @Mapping(target = "teacher", ignore = true)
    @Mapping(target = "lastLogin", ignore = true)
    @Mapping(target = "dateJoined", ignore = true)
    public abstract void updateEntity(@MappingTarget User user, UserUpdateRequestDto dto);

    @Named("avatarUrl")
    public String avatarUrl(String key) {
        if (key == null) {
            return null;
        } else {
            return fileStorage.url(key);
        }
    }
}
