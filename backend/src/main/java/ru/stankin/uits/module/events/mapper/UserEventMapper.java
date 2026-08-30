package ru.stankin.uits.module.events.mapper;

import org.mapstruct.Mapper;
import ru.stankin.uits.module.events.dto.EventUserDto;
import ru.stankin.uits.module.events.dto.UserEventResponseDto;
import ru.stankin.uits.module.events.entity.UserEvent;
import ru.stankin.uits.module.user.entity.User;

@Mapper(componentModel = "spring")
public interface UserEventMapper {

    UserEventResponseDto toDto(UserEvent event);

    EventUserDto toUserDto(User user);
}
