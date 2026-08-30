package ru.stankin.uits.module.students.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.stankin.uits.common.PageResponseDto;
import ru.stankin.uits.common.exception.InvalidRequestException;
import ru.stankin.uits.common.exception.NotFoundException;
import ru.stankin.uits.module.staff.entity.Teacher;
import ru.stankin.uits.module.staff.service.TeacherService;
import ru.stankin.uits.module.students.dto.PostgraduateRequestDto;
import ru.stankin.uits.module.students.dto.PostgraduateResponseDto;
import ru.stankin.uits.module.students.dto.StudentRequestDto;
import ru.stankin.uits.module.students.entity.Postgraduate;
import ru.stankin.uits.module.students.entity.Student;
import ru.stankin.uits.module.students.enums.EducationLevel;
import ru.stankin.uits.module.students.mapper.PostgraduateMapper;
import ru.stankin.uits.module.students.repository.PostgraduateRepository;
import ru.stankin.uits.module.students.repository.StudentRepository;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class PostgraduateService {

    private final PostgraduateRepository postgraduateRepository;
    private final StudentRepository studentRepository;
    private final PostgraduateMapper postgraduateMapper;
    private final TeacherService teacherService;

    @Transactional(readOnly = true)
    public PageResponseDto<PostgraduateResponseDto> getPostgraduates(Long teacherId,
                                                                     String speciality,
                                                                     Pageable pageable) {
        Page<Postgraduate> page = select(teacherId, normalize(speciality), pageable);

        return PageResponseDto.from(page.map(postgraduateMapper::toDto));
    }

    @Transactional
    public PostgraduateResponseDto createPostgraduate(PostgraduateRequestDto request) {
        Student student = postgraduateMapper.toStudent(validated(request.getStudent()));
        Teacher teacher = resolveTeacher(request.getTeacherId());

        Postgraduate postgraduate = Postgraduate.builder()
                .student(studentRepository.save(student))
                .teacher(teacher)
                .build();

        return postgraduateMapper.toDto(postgraduateRepository.save(postgraduate));
    }

    @Transactional
    public PostgraduateResponseDto updatePostgraduate(Long id, PostgraduateRequestDto request) {
        Postgraduate postgraduate = postgraduateRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Запись аспирантуры id=" + id + " не найдена"));
        StudentRequestDto studentRequest = validated(request.getStudent());
        Teacher teacher = resolveTeacher(request.getTeacherId());
        Student student = postgraduate.getStudent();

        if (student == null) {
            postgraduate.setStudent(studentRepository.save(postgraduateMapper.toStudent(studentRequest)));
        } else {
            postgraduateMapper.updateStudent(student, studentRequest);
        }
        postgraduate.setTeacher(teacher);

        return postgraduateMapper.toDto(postgraduate);
    }

    @Transactional
    public void deletePostgraduate(Long id) {
        Postgraduate postgraduate = postgraduateRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Запись аспирантуры id=" + id + " не найдена"));
        Student student = postgraduate.getStudent();

        postgraduateRepository.delete(postgraduate);
        if (student != null) {
            studentRepository.delete(student);
        }
    }

    private Page<Postgraduate> select(Long teacherId, String speciality, Pageable pageable) {
        if (teacherId != null && speciality != null) {
            return postgraduateRepository.findByTeacherIdAndStudentSpeciality(teacherId, speciality, pageable);
        }
        if (teacherId != null) {
            return postgraduateRepository.findByTeacherId(teacherId, pageable);
        }
        if (speciality != null) {
            return postgraduateRepository.findByStudentSpeciality(speciality, pageable);
        }

        return postgraduateRepository.findAllBy(pageable);
    }

    private StudentRequestDto validated(StudentRequestDto student) {
        if (student.getEducationLevel() != EducationLevel.POSTGRADUATE) {
            throw new InvalidRequestException("В записи аспирантуры уровень образования должен быть POSTGRADUATE");
        }

        int currentYear = LocalDate.now().getYear();
        if (student.getAdmissionYear() > currentYear) {
            throw new InvalidRequestException("Год поступления не может быть в будущем: " + student.getAdmissionYear());
        }

        return student;
    }

    private Teacher resolveTeacher(Long teacherId) {
        if (teacherId == null) {
            return null;
        }

        return teacherService.getTeacherEntity(teacherId);
    }

    private String normalize(String speciality) {
        if (speciality == null || speciality.isBlank()) {
            return null;
        }

        return speciality;
    }
}
