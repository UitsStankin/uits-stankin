package ru.stankin.uits.module.gradesheets.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.stankin.uits.common.PageResponseDto;
import ru.stankin.uits.common.exception.InvalidRequestException;
import ru.stankin.uits.common.exception.NotFoundException;
import ru.stankin.uits.module.gradesheets.dto.GradeSheetDetailsResponseDto;
import ru.stankin.uits.module.gradesheets.dto.GradeSheetResponseDto;
import ru.stankin.uits.module.gradesheets.entity.GradeSheet;
import ru.stankin.uits.module.gradesheets.entity.GradeSheetMark;
import ru.stankin.uits.module.gradesheets.mapper.GradeSheetMapper;
import ru.stankin.uits.module.gradesheets.repository.GradeSheetRepository;
import ru.stankin.uits.module.gradesheets.repository.GradeSheetSummary;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class GradeSheetService {

    private static final Set<String> SORT_FIELDS =
            Set.of("id", "group", "disciplineName", "semester", "importedAt");

    private final GradeSheetRepository gradeSheetRepository;
    private final GradeSheetMapper gradeSheetMapper;

    @Transactional(readOnly = true)
    public PageResponseDto<GradeSheetResponseDto> getGradeSheets(String group,
                                                                 String discipline,
                                                                 String semester,
                                                                 Pageable pageable) {
        validateSort(pageable.getSort());

        return PageResponseDto.from(gradeSheetRepository.search(
                        normalize(group),
                        escapeLike(normalize(discipline)),
                        normalize(semester),
                        pageable)
                .map(GradeSheetService::toDto));
    }

    private static GradeSheetResponseDto toDto(GradeSheetSummary summary) {
        return GradeSheetResponseDto.builder()
                .id(summary.getId())
                .discipline(summary.getDiscipline())
                .group(summary.getGroup())
                .semester(summary.getSemester())
                .department(summary.getDepartment())
                .direction(summary.getDirection())
                .teachers(summary.getTeachers())
                .teacherId(summary.getTeacherId())
                .subjectId(summary.getSubjectId())
                .studentCount(summary.getStudentCount())
                .importedFileName(summary.getImportedFileName())
                .importedAt(summary.getImportedAt())
                .build();
    }

    @Transactional(readOnly = true)
    public GradeSheetDetailsResponseDto getGradeSheet(Long id) {
        GradeSheet gradeSheet = gradeSheetRepository.findWithStudentsById(id)
                .orElseThrow(() -> new NotFoundException("Ведомость не найдена: id=" + id));

        GradeSheetDetailsResponseDto details = gradeSheetMapper.toDetailsDto(gradeSheet);
        details.setBlocks(blocks(gradeSheet));
        return details;
    }

    private List<String> blocks(GradeSheet gradeSheet) {
        return gradeSheet.getStudents().stream()
                .flatMap(student -> student.getMarks().stream())
                .map(GradeSheetMark::getBlock)
                .distinct()
                .toList();
    }

    private static void validateSort(Sort sort) {
        for (Sort.Order order : sort) {
            if (!SORT_FIELDS.contains(order.getProperty())) {
                throw new InvalidRequestException("Неизвестное поле сортировки: " + order.getProperty());
            }
        }
    }

    private static String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static String escapeLike(String value) {
        return value == null
                ? null
                : value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
