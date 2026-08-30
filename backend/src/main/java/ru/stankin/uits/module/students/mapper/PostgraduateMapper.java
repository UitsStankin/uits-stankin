package ru.stankin.uits.module.students.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import ru.stankin.uits.common.FullName;
import ru.stankin.uits.module.staff.entity.Teacher;
import ru.stankin.uits.module.students.dto.PostgraduateResponseDto;
import ru.stankin.uits.module.students.dto.StudentRequestDto;
import ru.stankin.uits.module.students.entity.Postgraduate;
import ru.stankin.uits.module.students.entity.Student;

@Mapper(componentModel = "spring")
public interface PostgraduateMapper {

    @Mapping(target = "studentId", source = "student.id")
    @Mapping(target = "studentName", expression = "java(studentName(postgraduate.getStudent()))")
    @Mapping(target = "speciality", source = "student.speciality")
    @Mapping(target = "diplomaTheme", source = "student.diplomaTheme")
    @Mapping(target = "admissionYear", source = "student.admissionYear")
    @Mapping(target = "teacherId", source = "teacher.id")
    @Mapping(target = "teacherName", expression = "java(teacherName(postgraduate.getTeacher()))")
    PostgraduateResponseDto toDto(Postgraduate postgraduate);

    @Mapping(target = "id", ignore = true)
    Student toStudent(StudentRequestDto dto);

    @Mapping(target = "id", ignore = true)
    void updateStudent(@MappingTarget Student student, StudentRequestDto dto);

    default String studentName(Student student) {
        if (student == null) {
            return null;
        }

        return FullName.of(student.getLastName(), student.getFirstName(), student.getPatronymic());
    }

    default String teacherName(Teacher teacher) {
        if (teacher == null) {
            return null;
        }

        return FullName.of(teacher.getLastName(), teacher.getFirstName(), teacher.getPatronymic());
    }
}
