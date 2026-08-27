package ru.stankin.uits.module.achievements.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;
import org.springframework.beans.factory.annotation.Autowired;
import ru.stankin.uits.common.storage.FileStorage;
import ru.stankin.uits.module.achievements.dto.AchievementRequestDto;
import ru.stankin.uits.module.achievements.dto.AchievementResponseDto;
import ru.stankin.uits.module.achievements.entity.Achievement;
import ru.stankin.uits.module.staff.entity.Teacher;

import java.util.stream.Collectors;
import java.util.stream.Stream;

@Mapper(componentModel = "spring")
public abstract class AchievementMapper {

    @Autowired
    protected FileStorage fileStorage;

    @Mapping(target = "previewImageUrl", source = "previewImage", qualifiedByName = "previewImageUrl")
    @Mapping(target = "teacherId", source = "teacher.id")
    @Mapping(target = "teacherName", source = "teacher", qualifiedByName = "teacherName")
    public abstract AchievementResponseDto toDto(Achievement entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "teacher", ignore = true)
    public abstract Achievement toEntity(AchievementRequestDto dto);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "teacher", ignore = true)
    public abstract void updateEntity(@MappingTarget Achievement entity, AchievementRequestDto dto);

    @Named("teacherName")
    public String teacherName(Teacher teacher) {
        if (teacher == null) {
            return null;
        } else {
            return Stream.of(teacher.getLastName(), teacher.getFirstName(), teacher.getPatronymic())
                    .filter(part -> part != null && !part.isBlank())
                    .collect(Collectors.joining(" "));
        }
    }

    @Named("previewImageUrl")
    public String previewImageUrl(String key) {
        if (key == null) {
            return null;
        } else {
            return fileStorage.url(key);
        }
    }
}
