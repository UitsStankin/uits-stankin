package ru.stankin.uits.module.schedule.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import ru.stankin.uits.common.exception.InvalidFileException;
import ru.stankin.uits.module.schedule.client.ScheduleServiceClient;
import ru.stankin.uits.module.schedule.dto.ParsedExamsDto;
import ru.stankin.uits.module.schedule.dto.ParsedScheduleDto;
import ru.stankin.uits.module.schedule.dto.ScheduleResponseDto;
import ru.stankin.uits.module.schedule.dto.ExamScheduleResponseDto;

import java.io.IOException;
import java.io.UncheckedIOException;

@Service
@RequiredArgsConstructor
public class ScheduleImportService {

    private static final long MAX_PDF_BYTES = 5L * 1024 * 1024;

    private final ScheduleServiceClient scheduleServiceClient;
    private final ScheduleService scheduleService;
    private final ExamScheduleService examScheduleService;

    public ScheduleResponseDto importFromPdf(Long teacherId, MultipartFile file) {
        requireUsable(file);
        scheduleService.requireTeacherExists(teacherId);

        ParsedScheduleDto parsed = scheduleServiceClient.parse(bytesOf(file), file.getOriginalFilename());

        return scheduleService.replaceSchedule(teacherId, file.getOriginalFilename(), parsed);
    }

    public ExamScheduleResponseDto importExamsFromPdf(Long teacherId, MultipartFile file) {
        requireUsable(file);
        examScheduleService.requireTeacherExists(teacherId);

        ParsedExamsDto parsed = scheduleServiceClient.parseExams(bytesOf(file), file.getOriginalFilename());

        return examScheduleService.replaceExamSchedule(teacherId, file.getOriginalFilename(), parsed);
    }

    private void requireUsable(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidFileException("Файл расписания не выбран.");
        }
        if (file.getSize() > MAX_PDF_BYTES) {
            throw new InvalidFileException(
                    "Файл расписания больше " + MAX_PDF_BYTES / (1024 * 1024) + " МБ.");
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
