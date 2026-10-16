package ru.stankin.uits.module.gradesheets.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import ru.stankin.uits.common.exception.InvalidFileException;
import ru.stankin.uits.module.gradesheets.client.GradeSheetParseClient;
import ru.stankin.uits.module.gradesheets.dto.GradeSheetImportResponseDto;
import ru.stankin.uits.module.gradesheets.dto.ParsedGradeSheetDto;
import ru.stankin.uits.module.gradesheets.dto.ParsedGradeSheetsDto;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;

@Service
@RequiredArgsConstructor
public class GradeSheetImportService {

    private static final long MAX_WORKBOOK_BYTES = 5L * 1024 * 1024;

    private final GradeSheetParseClient gradeSheetParseClient;
    private final GradeSheetWriter gradeSheetWriter;

    public GradeSheetImportResponseDto importFromWorkbook(MultipartFile file) {
        requireUsable(file);

        ParsedGradeSheetsDto parsed =
                gradeSheetParseClient.parse(bytesOf(file), file.getOriginalFilename());
        List<ParsedGradeSheetDto> sheets = parsed.getSheets();
        if (sheets == null || sheets.isEmpty()) {
            throw new InvalidFileException("В книге нет ни одной ведомости.");
        }

        return GradeSheetImportResponseDto.builder()
                .sheets(gradeSheetWriter.saveAll(sheets, file.getOriginalFilename()))
                .build();
    }

    private void requireUsable(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidFileException("Файл ведомости не выбран.");
        }
        if (file.getSize() > MAX_WORKBOOK_BYTES) {
            throw new InvalidFileException(
                    "Файл ведомости больше " + MAX_WORKBOOK_BYTES / (1024 * 1024) + " МБ.");
        }
    }

    private byte[] bytesOf(MultipartFile file) {
        try {
            return file.getBytes();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
