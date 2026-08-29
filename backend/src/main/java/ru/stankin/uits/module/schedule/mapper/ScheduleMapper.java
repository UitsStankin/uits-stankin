package ru.stankin.uits.module.schedule.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
import ru.stankin.uits.module.schedule.dto.ExamScheduleResponseDto;
import ru.stankin.uits.module.schedule.dto.ScheduleResponseDto;
import ru.stankin.uits.module.schedule.entity.Schedule;
import ru.stankin.uits.module.staff.entity.Teacher;

import java.util.stream.Collectors;
import java.util.stream.Stream;

@Mapper(componentModel = "spring")
public interface ScheduleMapper {

    @Mapping(source = "teacher.id", target = "teacherId")
    @Mapping(source = "teacher", target = "teacherName", qualifiedByName = "teacherName")
    ScheduleResponseDto toDto(Schedule schedule);

    @Mapping(target = "teacherId", source = "id")
    @Mapping(target = "teacherName", expression = "java(teacherName(teacher))")
    ExamScheduleResponseDto toExamDto(Teacher teacher);

    @Named("teacherName")
    default String teacherName(Teacher teacher) {
        if (teacher == null) {
            return null;
        }

        return Stream.of(teacher.getLastName(), teacher.getFirstName(), teacher.getPatronymic())
                .filter(part -> part != null && !part.isBlank())
                .collect(Collectors.joining(" "));
    }
}
