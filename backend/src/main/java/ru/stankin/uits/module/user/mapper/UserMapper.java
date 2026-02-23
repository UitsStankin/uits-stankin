package ru.stankin.uits.module.user.mapper;

import org.mapstruct.Mapper;
import ru.stankin.uits.module.user.dto.UserResponseDto;
import ru.stankin.uits.module.user.entity.User;

@Mapper(componentModel = "spring")
public interface UserMapper {
    UserResponseDto toDto(User user);
}