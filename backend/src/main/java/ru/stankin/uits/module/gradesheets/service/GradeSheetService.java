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
import ru.stankin.uits.module.gradesheets.mapper.GradeSheetMapper;
import ru.stankin.uits.module.gradesheets.repository.GradeSheetRepository;
import ru.stankin.uits.module.gradesheets.repository.GradeSheetSummary;

import java.util.Set;

import static ru.stankin.uits.common.SortFields.validate;
import static ru.stankin.uits.common.SearchText.escapeLike;
import static ru.stankin.uits.common.SearchText.normalize;

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
        validate(pageable.getSort(), SORT_FIELDS);

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

        return gradeSheetMapper.toDetailsDto(gradeSheet);
    }
}
