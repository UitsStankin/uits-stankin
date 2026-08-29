package ru.stankin.uits.module.schedule.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import ru.stankin.uits.module.schedule.dto.ScheduleResponseDto;
import ru.stankin.uits.module.schedule.entity.Schedule;

@Mapper(componentModel = "spring")
public interface ScheduleMapper {

    @Mapping(source = "teacher.id", target = "teacherId")
    ScheduleResponseDto toDto(Schedule schedule);
}
