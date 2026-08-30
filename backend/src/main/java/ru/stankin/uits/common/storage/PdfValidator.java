package ru.stankin.uits.common.storage;

import org.springframework.stereotype.Component;
import ru.stankin.uits.common.exception.InvalidFileException;

import java.nio.charset.StandardCharsets;

@Component
public class PdfValidator {

    private static final long MAX_SIZE_BYTES = 15L * 1024 * 1024;
    private static final byte[] SIGNATURE = "%PDF-".getBytes(StandardCharsets.US_ASCII);

    public void validate(byte[] data) {
        if (data.length > MAX_SIZE_BYTES) {
            throw new InvalidFileException("Размер файла превышает " + MAX_SIZE_BYTES / 1024 / 1024 + " МБ");
        }

        if (!startsWithSignature(data)) {
            throw new InvalidFileException("Файл не является PDF");
        }
    }

    private boolean startsWithSignature(byte[] data) {
        if (data.length < SIGNATURE.length) {
            return false;
        }

        for (int i = 0; i < SIGNATURE.length; i++) {
            if (data[i] != SIGNATURE[i]) {
                return false;
            }
        }

        return true;
    }
}
