package ru.stankin.uits.common.storage;

import org.junit.jupiter.api.Test;
import ru.stankin.uits.common.exception.InvalidFileException;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.zip.CRC32;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Тесты обработки изображений. Картинки-фикстуры не нужны: изображение нужного размера
 * и формата собирается прямо здесь через {@link ImageIO}.
 */
class ImageProcessorTest {

    private final ImageProcessor processor = new ImageProcessor();

    @Test
    void process_WhenImageTooLarge_ScalesDownKeepingAspectRatio() throws IOException {
        byte[] original = image(3000, 2000, "jpeg");

        ProcessedImage result = processor.process(original);

        BufferedImage scaled = read(result);
        assertThat(scaled.getWidth()).isEqualTo(1600);
        assertThat(scaled.getHeight()).isBetween(1060, 1070);
    }

    /** Без ограничения снизу мелкая картинка растянулась бы до 1600 и стала мыльной. */
    @Test
    void process_WhenImageSmall_KeepsOriginalSize() throws IOException {
        byte[] original = image(200, 100, "jpeg");

        ProcessedImage result = processor.process(original);

        BufferedImage scaled = read(result);
        assertThat(scaled.getWidth()).isEqualTo(200);
        assertThat(scaled.getHeight()).isEqualTo(100);
    }

    @Test
    void process_WhenJpeg_ReturnsJpgExtension() throws IOException {
        ProcessedImage result = processor.process(image(300, 300, "jpeg"));

        assertThat(result.extension()).isEqualTo("jpg");
    }

    @Test
    void process_WhenPng_ReturnsPngExtension() throws IOException {
        ProcessedImage result = processor.process(image(300, 300, "png"));

        assertThat(result.extension()).isEqualTo("png");
        assertThat(read(result).getWidth()).isEqualTo(300);
    }

    /** Расширению и заголовку запроса не верим: формат определяется по содержимому файла. */
    @Test
    void process_WhenNotAnImage_Throws() {
        byte[] executable = "MZ это не картинка".getBytes(StandardCharsets.UTF_8);

        assertThatThrownBy(() -> processor.process(executable))
                .isInstanceOf(InvalidFileException.class)
                .hasMessageContaining("не является изображением");
    }

    /** GIF читается, но в белый список не входит: ресайз убил бы анимацию. */
    @Test
    void process_WhenFormatNotAllowed_Throws() throws IOException {
        byte[] gif = image(300, 300, "gif");

        assertThatThrownBy(() -> processor.process(gif))
                .isInstanceOf(InvalidFileException.class)
                .hasMessageContaining("не поддерживается");
    }

    @Test
    void process_WhenFileExceedsSizeLimit_Throws() {
        byte[] oversized = new byte[16 * 1024 * 1024];

        assertThatThrownBy(() -> processor.process(oversized))
                .isInstanceOf(InvalidFileException.class)
                .hasMessageContaining("превышает");
    }

    @Test
    void process_WhenImageHasTooManyPixels_ThrowsWithoutDecoding() {
        byte[] header = pngHeader(20000, 20000);

        assertThatThrownBy(() -> processor.process(header))
                .isInstanceOf(InvalidFileException.class)
                .hasMessageContaining("мегапикселей");
    }

    @Test
    void process_WhenImageIsWithinPixelLimit_Passes() throws IOException {
        ProcessedImage result = processor.process(image(1000, 1000, "png"));

        assertThat(result.extension()).isEqualTo("png");
    }

    private byte[] pngHeader(int width, int height) {
        ByteBuffer ihdr = ByteBuffer.allocate(17);
        ihdr.put("IHDR".getBytes(StandardCharsets.US_ASCII));
        ihdr.putInt(width);
        ihdr.putInt(height);
        ihdr.put((byte) 8);
        ihdr.put((byte) 2);
        ihdr.put((byte) 0);
        ihdr.put((byte) 0);
        ihdr.put((byte) 0);

        CRC32 crc = new CRC32();
        crc.update(ihdr.array());

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.writeBytes(new byte[] {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A});
        out.writeBytes(ByteBuffer.allocate(4).putInt(13).array());
        out.writeBytes(ihdr.array());
        out.writeBytes(ByteBuffer.allocate(4).putInt((int) crc.getValue()).array());

        return out.toByteArray();
    }

    private byte[] image(int width, int height, String format) throws IOException {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, format, out);

        return out.toByteArray();
    }

    private BufferedImage read(ProcessedImage result) throws IOException {
        return ImageIO.read(new ByteArrayInputStream(result.data()));
    }
}
