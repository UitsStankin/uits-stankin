package ru.stankin.uits.module.staff.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import ru.stankin.uits.module.staff.dto.TeacherResponseDto;
import ru.stankin.uits.module.staff.entity.Teacher;

@Mapper(componentModel = "spring")
public interface TeacherMapper {

    @Mapping(source = "user.id", target = "userId")
    @Mapping(source = "user.firstName", target = "firstName")
    @Mapping(source = "user.lastName", target = "lastName")
    @Mapping(source = "user.avatar", target = "avatar")
    @Mapping(source = "user.email", target = "email")
    TeacherResponseDto toDto(Teacher teacher);
}
