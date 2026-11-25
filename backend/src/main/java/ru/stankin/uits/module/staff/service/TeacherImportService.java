package ru.stankin.uits.module.staff.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import ru.stankin.uits.common.exception.InvalidFileException;
import ru.stankin.uits.module.staff.client.StaffImportParseClient;
import ru.stankin.uits.module.staff.dto.DuplicateStrategy;
import ru.stankin.uits.module.staff.dto.ParsedStaffFileDto;
import ru.stankin.uits.module.staff.dto.ParsedStaffRowDto;
import ru.stankin.uits.module.staff.dto.TeacherImportResponseDto;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class TeacherImportService {

    private static final long MAX_FILE_BYTES = 5L * 1024 * 1024;

    private final StaffImportParseClient staffImportParseClient;
    private final TeacherImportProcessor teacherImportProcessor;

    public TeacherImportResponseDto importFromFile(
            MultipartFile file,
            boolean dryRun,
            DuplicateStrategy onDuplicate
    ) {
        requireUsable(file);

        ParsedStaffFileDto parsed =
                staffImportParseClient.parse(bytesOf(file), file.getOriginalFilename());
        List<ParsedStaffRowDto> rows = parsed == null ? null : parsed.getRows();
        if (rows == null || rows.isEmpty()) {
            throw new InvalidFileException("В файле нет ни одной строки данных.");
        }

        DuplicateStrategy strategy = onDuplicate == null ? DuplicateStrategy.SKIP : onDuplicate;
        return dryRun
                ? teacherImportProcessor.preview(rows, strategy)
                : teacherImportProcessor.apply(rows, strategy);
    }

    private void requireUsable(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidFileException("Файл со списком сотрудников не выбран.");
        }
        if (file.getSize() > MAX_FILE_BYTES) {
            throw new InvalidFileException(
                    "Файл больше допустимых " + MAX_FILE_BYTES / (1024 * 1024) + " МБ.");
        }
        String filename = file.getOriginalFilename();
        String lower = filename == null ? "" : filename.trim().toLowerCase(Locale.ROOT);
        if (!lower.endsWith(".xlsx") && !lower.endsWith(".csv")) {
            throw new InvalidFileException("Поддерживаются только файлы формата .xlsx и .csv.");
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
