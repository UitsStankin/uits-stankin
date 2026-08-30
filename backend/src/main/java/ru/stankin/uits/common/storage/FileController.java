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

    private static final Set<String> ALLOWED_CATEGORIES =
            Set.of("news", "avatars", "publications", "achievements");

    private static final Set<String> PDF_CATEGORIES = Set.of("publications");

    private static final String PDF_EXTENSION = "pdf";

    private static final Set<String> THUMBNAIL_CATEGORIES = Set.of("news");

    private static final String THUMBNAIL_SUFFIX = "_thumb";

    private final FileStorage fileStorage;
    private final ImageProcessor imageProcessor;
    private final PdfValidator pdfValidator;

    @PostMapping
    @PreAuthorize("#category == 'avatars' or hasAnyRole('ADMIN', 'MODERATOR')")
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

        byte[] content;

        try (InputStream in = file.getInputStream()) {
            content = in.readAllBytes();
        } catch (IOException e) {
            throw new InvalidFileException("Не удалось прочитать файл");
        }

        String key = PDF_CATEGORIES.contains(category)
                ? storePdf(content, category)
                : storeImage(content, category);

        return ResponseEntity.status(201).body(new FileUploadResponseDto(key, fileStorage.url(key)));
    }

    private String storePdf(byte[] content, String category) {
        pdfValidator.validate(content);

        return fileStorage.store(new ByteArrayInputStream(content), PDF_EXTENSION, category);
    }

    private String storeImage(byte[] content, String category) {
        ProcessedImage processed = imageProcessor.process(content);
        String key = fileStorage.store(new ByteArrayInputStream(processed.data()),
                processed.extension(), category);

        if (THUMBNAIL_CATEGORIES.contains(category)) {
            ProcessedImage thumbnail = imageProcessor.thumbnail(content);
            fileStorage.storeVariant(key, THUMBNAIL_SUFFIX, new ByteArrayInputStream(thumbnail.data()));
        }

        return key;
    }
}