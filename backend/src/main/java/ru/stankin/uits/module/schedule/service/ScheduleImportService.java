package ru.stankin.uits.module.schedule.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import ru.stankin.uits.common.exception.InvalidFileException;
import ru.stankin.uits.module.schedule.client.ScheduleServiceClient;
import ru.stankin.uits.module.schedule.dto.ParsedScheduleDto;
import ru.stankin.uits.module.schedule.dto.ScheduleResponseDto;

import java.io.IOException;
import java.io.UncheckedIOException;

@Service
@RequiredArgsConstructor
public class ScheduleImportService {

    private final ScheduleServiceClient scheduleServiceClient;
    private final ScheduleService scheduleService;

    public ScheduleResponseDto importFromPdf(Long teacherId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidFileException("Файл расписания не выбран.");
        }
        scheduleService.requireTeacherExists(teacherId);

        ParsedScheduleDto parsed = scheduleServiceClient.parse(bytesOf(file), file.getOriginalFilename());

        return scheduleService.replaceSchedule(teacherId, file.getOriginalFilename(), parsed);
    }

    private byte[] bytesOf(MultipartFile file) {
        try {
            return file.getBytes();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
