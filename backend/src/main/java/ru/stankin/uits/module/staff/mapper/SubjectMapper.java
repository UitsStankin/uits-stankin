package ru.stankin.uits.module.staff.mapper;

import org.mapstruct.Mapper;
import ru.stankin.uits.module.staff.dto.SubjectDto;
import ru.stankin.uits.module.staff.entity.Subject;

@Mapper(componentModel = "spring")
public interface SubjectMapper {
    SubjectDto toDto(Subject subject);
}
