package ru.stankin.uits.common.storage;

import net.coobird.thumbnailator.Thumbnails;
import org.springframework.stereotype.Component;
import ru.stankin.uits.common.exception.InvalidFileException;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import java.awt.Graphics2D;
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
    private static final Map<String, String> FORMATS_BY_EXTENSION = Map.of("jpg", "jpeg", "png", "png");
    private static final String JPEG_FORMAT = "jpeg";
    private static final String PNG_FORMAT = "png";
    private static final float CONVERTED_JPEG_QUALITY = 0.85f;
    private static final int MIN_JPEG_GAIN = 2;

    public ProcessedImage process(byte[] data) {
        if (data.length > MAX_SIZE_BYTES) {
            throw new InvalidFileException("Размер файла превышает " + MAX_SIZE_BYTES / 1024 / 1024 + " МБ");
        }

        String format = inspect(data);

        try {
            BufferedImage original = ImageIO.read(new ByteArrayInputStream(data));
            byte[] encoded = encode(original, MAX_WIDTH, MAX_HEIGHT, format, false);

            if (isConvertibleToJpeg(format, original)) {
                byte[] jpeg = encode(original, MAX_WIDTH, MAX_HEIGHT, JPEG_FORMAT, true);

                if (jpeg.length * MIN_JPEG_GAIN <= encoded.length) {
                    return new ProcessedImage(jpeg, ALLOWED_FORMATS.get(JPEG_FORMAT));
                }
            }

            return new ProcessedImage(encoded, ALLOWED_FORMATS.get(format));
        } catch (IOException e) {
            throw new InvalidFileException("Не удалось обработать изображение");
        }
    }

    /**
     * Уменьшенная копия для списков. Формат и расширение — как у основной
     * версии, чтобы ключ варианта отличался только суффиксом.
     */
    public ProcessedImage thumbnail(byte[] data, String extension) {
        String format = FORMATS_BY_EXTENSION.get(extension);

        if (format == null) {
            throw new IllegalArgumentException("Неизвестное расширение: " + extension);
        }

        String sourceFormat = inspect(data);

        try {
            BufferedImage original = ImageIO.read(new ByteArrayInputStream(data));
            byte[] encoded = encode(original, THUMBNAIL_SIZE, THUMBNAIL_SIZE, format, !format.equals(sourceFormat));

            return new ProcessedImage(encoded, extension);
        } catch (IOException e) {
            throw new InvalidFileException("Не удалось обработать изображение");
        }
    }

    private boolean isConvertibleToJpeg(String format, BufferedImage image) {
        return PNG_FORMAT.equals(format) && (!image.getColorModel().hasAlpha() || isFullyOpaque(image));
    }

    private boolean isFullyOpaque(BufferedImage image) {
        int width = image.getWidth();
        int[] row = new int[width];

        for (int y = 0; y < image.getHeight(); y++) {
            image.getRGB(0, y, width, 1, row, 0, width);

            for (int argb : row) {
                if ((argb >>> 24) != 0xFF) {
                    return false;
                }
            }
        }

        return true;
    }

    private byte[] encode(BufferedImage source, int maxWidth, int maxHeight, String format,
                          boolean convertedFromPng) throws IOException {
        BufferedImage image = convertedFromPng ? toRgb(source) : source;
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        Thumbnails.Builder<BufferedImage> builder = Thumbnails.of(image)
                .size(Math.min(image.getWidth(), maxWidth),
                      Math.min(image.getHeight(), maxHeight))
                .keepAspectRatio(true)
                .outputFormat(format);

        if (convertedFromPng) {
            builder.outputQuality(CONVERTED_JPEG_QUALITY);
        }

        builder.toOutputStream(out);

        return out.toByteArray();
    }

    private BufferedImage toRgb(BufferedImage source) {
        if (source.getType() == BufferedImage.TYPE_INT_RGB) {
            return source;
        }

        BufferedImage rgb = new BufferedImage(source.getWidth(), source.getHeight(), BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = rgb.createGraphics();

        try {
            graphics.drawImage(source, 0, 0, null);
        } finally {
            graphics.dispose();
        }

        return rgb;
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
