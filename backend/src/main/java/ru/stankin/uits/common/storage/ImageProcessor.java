package ru.stankin.uits.common.storage;

import net.coobird.thumbnailator.Thumbnails;
import org.springframework.stereotype.Component;
import ru.stankin.uits.common.exception.InvalidFileException;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Iterator;
import java.util.Locale;
import java.util.Map;

@Component
public class ImageProcessor {
    private static final long MAX_SIZE_BYTES = 15L * 1024 * 1024;
    private static final long MAX_PIXELS = 25_000_000L;
    private static final int MAX_WIDTH = 1600;
    private static final int THUMBNAIL_SIZE = 240;
    private static final int MAX_HEIGHT = 1600;
    private static final Map<String, String> ALLOWED_FORMATS = Map.of("jpeg", "jpg", "png", "png");

    public ProcessedImage process(byte[] data) {
        if (data.length > MAX_SIZE_BYTES) {
            throw new InvalidFileException("Размер файла превышает " + MAX_SIZE_BYTES / 1024 / 1024 + " МБ");
        }

        String format = inspect(data);

        try {
            BufferedImage original = ImageIO.read(new ByteArrayInputStream(data));
            ByteArrayOutputStream out = new ByteArrayOutputStream();

            Thumbnails.of(original)
                    .size(Math.min(original.getWidth(), MAX_WIDTH),
                          Math.min(original.getHeight(), MAX_HEIGHT))
                    .keepAspectRatio(true)
                    .outputFormat(format)
                    .toOutputStream(out);

            return new ProcessedImage(out.toByteArray(), ALLOWED_FORMATS.get(format));
        } catch (IOException e) {
            throw new InvalidFileException("Не удалось обработать изображение");
        }
    }

    /**
     * Уменьшенная копия для списков. Формат и расширение — как у основной
     * версии, чтобы ключ варианта отличался только суффиксом.
     */
    public ProcessedImage thumbnail(byte[] data) {
        String format = inspect(data);

        try {
            BufferedImage original = ImageIO.read(new ByteArrayInputStream(data));
            ByteArrayOutputStream out = new ByteArrayOutputStream();

            Thumbnails.of(original)
                    .size(Math.min(original.getWidth(), THUMBNAIL_SIZE),
                          Math.min(original.getHeight(), THUMBNAIL_SIZE))
                    .keepAspectRatio(true)
                    .outputFormat(format)
                    .toOutputStream(out);

            return new ProcessedImage(out.toByteArray(), ALLOWED_FORMATS.get(format));
        } catch (IOException e) {
            throw new InvalidFileException("Не удалось обработать изображение");
        }
    }

    private String inspect(byte[] data) {
        try (ImageInputStream stream = ImageIO.createImageInputStream(new ByteArrayInputStream(data))) {
            Iterator<ImageReader> readers = ImageIO.getImageReaders(stream);

            if (!readers.hasNext()) {
                throw new InvalidFileException("Файл не является изображением");
            }

            ImageReader reader = readers.next();

            try {
                reader.setInput(stream);
                String format = reader.getFormatName().toLowerCase(Locale.ROOT);

                if (!ALLOWED_FORMATS.containsKey(format)) {
                    throw new InvalidFileException("Формат " + format + " не поддерживается");
                }

                long pixels = (long) reader.getWidth(0) * reader.getHeight(0);

                if (pixels > MAX_PIXELS) {
                    throw new InvalidFileException(
                            "Изображение больше " + MAX_PIXELS / 1_000_000 + " мегапикселей");
                }

                return format;
            } finally {
                reader.dispose();
            }
        } catch (IOException e) {
            throw new InvalidFileException("Не удалось прочитать файл");
        }
    }
}
