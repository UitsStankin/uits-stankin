package ru.stankin.uits.module.gradesheets.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import ru.stankin.uits.module.gradesheets.dto.GradeSheetDetailsResponseDto;
import ru.stankin.uits.module.gradesheets.dto.GradeSheetMarkResponseDto;
import ru.stankin.uits.module.gradesheets.dto.GradeSheetStudentResponseDto;
import ru.stankin.uits.module.gradesheets.entity.GradeSheet;
import ru.stankin.uits.module.gradesheets.entity.GradeSheetMark;
import ru.stankin.uits.module.gradesheets.entity.GradeSheetStudent;

@Mapper(componentModel = "spring")
public interface GradeSheetMapper {

    @Mapping(source = "disciplineName", target = "discipline")
    @Mapping(source = "importedTeachers", target = "teachers")
    @Mapping(source = "teacher.id", target = "teacherId")
    @Mapping(source = "subject.id", target = "subjectId")
    GradeSheetDetailsResponseDto toDetailsDto(GradeSheet gradeSheet);

    @Mapping(source = "studentNumber", target = "number")
    GradeSheetStudentResponseDto toDto(GradeSheetStudent student);

    @Mapping(source = "teacherName", target = "teacher")
    GradeSheetMarkResponseDto toDto(GradeSheetMark mark);
}
