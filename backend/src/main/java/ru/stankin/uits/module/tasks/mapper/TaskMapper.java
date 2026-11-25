package ru.stankin.uits.module.tasks.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import ru.stankin.uits.module.tasks.dto.TaskAssigneeResponseDto;
import ru.stankin.uits.module.tasks.dto.TaskAuthorDto;
import ru.stankin.uits.module.tasks.dto.TaskResponseDto;
import ru.stankin.uits.module.tasks.entity.Task;
import ru.stankin.uits.module.tasks.entity.TaskAssignee;
import ru.stankin.uits.module.user.entity.User;

@Mapper(componentModel = "spring")
public interface TaskMapper {

    TaskResponseDto toDto(Task task);

    TaskAuthorDto toAuthorDto(User user);

    @Mapping(target = "userId", source = "user.id")
    @Mapping(target = "firstName", source = "user.firstName")
    @Mapping(target = "lastName", source = "user.lastName")
    TaskAssigneeResponseDto toAssigneeDto(TaskAssignee assignee);
}
