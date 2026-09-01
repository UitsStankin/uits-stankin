package ru.stankin.uits.module.staff.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;
import org.springframework.beans.factory.annotation.Autowired;
import ru.stankin.uits.common.storage.FileStorage;
import ru.stankin.uits.module.staff.dto.SubjectDto;
import ru.stankin.uits.module.staff.dto.TeacherDetailsResponseDto;
import ru.stankin.uits.module.staff.dto.TeacherRequestDto;
import ru.stankin.uits.module.staff.dto.TeacherResponseDto;
import ru.stankin.uits.module.staff.entity.Subject;
import ru.stankin.uits.module.staff.entity.Teacher;

import java.util.Comparator;
import java.util.List;
import java.util.Set;

@Mapper(componentModel = "spring")
public abstract class TeacherMapper {

    @Autowired
    protected FileStorage fileStorage;

    @Autowired
    protected SubjectMapper subjectMapper;

    @Mapping(target = "avatarUrl", source = "avatar", qualifiedByName = "avatarUrl")
    public abstract TeacherResponseDto toDto(Teacher teacher);

    @Mapping(target = "avatarUrl", source = "avatar", qualifiedByName = "avatarUrl")
    @Mapping(target = "subjects", source = "subjects", qualifiedByName = "sortedSubjects")
    @Mapping(target = "userId", source = "user.id")
    public abstract TeacherDetailsResponseDto toDetailsDto(Teacher teacher);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "subjects", ignore = true)
    public abstract Teacher toEntity(TeacherRequestDto dto);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "subjects", ignore = true)
    public abstract void updateEntity(@MappingTarget Teacher teacher, TeacherRequestDto dto);

    @Named("avatarUrl")
    public String avatarUrl(String key) {
        if (key == null) {
            return null;
        } else {
            return fileStorage.url(key);
        }
    }

    @Named("sortedSubjects")
    public List<SubjectDto> sortedSubjects(Set<Subject> subjects) {
        return subjects.stream()
                .sorted(Comparator.comparing(Subject::getName))
                .map(subjectMapper::toDto)
                .toList();
    }
}
