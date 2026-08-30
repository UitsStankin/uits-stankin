package ru.stankin.uits.module.events.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import ru.stankin.uits.module.events.dto.EventUserDto;
import ru.stankin.uits.module.events.dto.UserEventRequestDto;
import ru.stankin.uits.module.events.dto.UserEventResponseDto;
import ru.stankin.uits.module.events.entity.UserEvent;
import ru.stankin.uits.module.user.entity.User;

@Mapper(componentModel = "spring")
public interface UserEventMapper {

    UserEventResponseDto toDto(UserEvent event);

    EventUserDto toUserDto(User user);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "owner", ignore = true)
    @Mapping(target = "assignedUsers", ignore = true)
    @Mapping(target = "startNotified", ignore = true)
    @Mapping(target = "nextNotificationAt", ignore = true)
    UserEvent toEntity(UserEventRequestDto dto);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "owner", ignore = true)
    @Mapping(target = "assignedUsers", ignore = true)
    @Mapping(target = "startNotified", ignore = true)
    @Mapping(target = "nextNotificationAt", ignore = true)
    void updateEntity(@MappingTarget UserEvent event, UserEventRequestDto dto);
}
