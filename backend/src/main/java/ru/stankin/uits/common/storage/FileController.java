package ru.stankin.uits.common.storage;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import ru.stankin.uits.common.exception.InvalidFileException;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Set;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileController {

    private static final Set<String> ALLOWED_CATEGORIES = Set.of("news", "avatars", "publications");

    private final FileStorage fileStorage;
    private final ImageProcessor imageProcessor;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public ResponseEntity<FileUploadResponseDto> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "news") String category
    ) {
        if (file.isEmpty()) {
            throw new InvalidFileException("Файл не передан");
        }

        if (!ALLOWED_CATEGORIES.contains(category)) {
            throw new InvalidFileException("Неизвестный раздел хранилища: " + category);
        }

        ProcessedImage processed;

        try (InputStream in = file.getInputStream()) {
            processed = imageProcessor.process(in.readAllBytes());
        } catch (IOException e) {
            throw new InvalidFileException("Не удалось прочитать файл");
        }

        String key = fileStorage.store(new ByteArrayInputStream(processed.data()),
                processed.extension(), category);

        return ResponseEntity.status(201).body(new FileUploadResponseDto(key, fileStorage.url(key)));
    }
}