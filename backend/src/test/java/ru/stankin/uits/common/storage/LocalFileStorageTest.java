package ru.stankin.uits.common.storage;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Тесты локального хранилища. Spring-контекст не поднимается: зависимость одна — путь
 * к каталогу. Каталог свой на каждый тест ({@link TempDir}), поэтому тесты изолированы.
 */
class LocalFileStorageTest {

    private static final String PUBLIC_BASE_URL = "/media";
    private static final String CATEGORY = "news";
    private static final String EXTENSION = "jpg";

    @TempDir
    Path tempDir;

    @Test
    void store_WhenCalled_WritesBytesToDisk() {
        Path root = tempDir.resolve("media");
        LocalFileStorage storage = new LocalFileStorage(root.toString(), PUBLIC_BASE_URL);

        String key = storage.store(content("содержимое картинки"), EXTENSION, CATEGORY);

        Path stored = root.resolve(key);
        assertThat(stored).exists();
        assertThat(stored).hasContent("содержимое картинки");
    }

    @Test
    void store_WhenCalled_ReturnsKeyWithCategoryDateAndExtension() {
        LocalFileStorage storage = new LocalFileStorage(tempDir.toString(), PUBLIC_BASE_URL);

        String key = storage.store(content("данные"), EXTENSION, CATEGORY);

        String expectedDatePath = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy/MM"));
        assertThat(key)
                .startsWith(CATEGORY + "/" + expectedDatePath + "/")
                .endsWith("." + EXTENSION);
    }

    /** Имя генерирует хранилище, поэтому одноимённые исходные файлы не затирают друг друга. */
    @Test
    void store_WhenCalledTwice_KeepsBothFiles() {
        LocalFileStorage storage = new LocalFileStorage(tempDir.toString(), PUBLIC_BASE_URL);

        String firstKey = storage.store(content("первый"), EXTENSION, CATEGORY);
        String secondKey = storage.store(content("второй"), EXTENSION, CATEGORY);

        assertThat(firstKey).isNotEqualTo(secondKey);
        assertThat(tempDir.resolve(firstKey)).hasContent("первый");
        assertThat(tempDir.resolve(secondKey)).hasContent("второй");
    }

    /** На чистой машине каталога нет: без создания при старте первая загрузка упала бы. */
    @Test
    void constructor_WhenRootMissing_CreatesIt() {
        Path root = tempDir.resolve("media/uploads");

        new LocalFileStorage(root.toString(), PUBLIC_BASE_URL);

        assertThat(root).exists().isDirectory();
    }

    @Test
    void delete_WhenFileExists_RemovesIt() {
        LocalFileStorage storage = new LocalFileStorage(tempDir.toString(), PUBLIC_BASE_URL);
        String key = storage.store(content("данные"), EXTENSION, CATEGORY);

        storage.delete(key);

        assertThat(tempDir.resolve(key)).doesNotExist();
    }

    /** Исключение здесь уронило бы замену картинки, если файл стёрли мимо приложения. */
    @Test
    void delete_WhenFileMissing_DoesNotThrow() {
        LocalFileStorage storage = new LocalFileStorage(tempDir.toString(), PUBLIC_BASE_URL);

        assertThatCode(() -> storage.delete("news/2026/08/never-existed.jpg"))
                .doesNotThrowAnyException();
    }

    /** Без проверки на выход за корень этот вызов стёр бы посторонний файл. */
    @Test
    void delete_WhenKeyEscapesRoot_ThrowsAndKeepsOutsideFile() throws Exception {
        Path root = tempDir.resolve("media");
        Path outsideFile = tempDir.resolve("secret.yaml");
        Files.writeString(outsideFile, "секрет");
        LocalFileStorage storage = new LocalFileStorage(root.toString(), PUBLIC_BASE_URL);

        assertThatThrownBy(() -> storage.delete("../secret.yaml"))
                .isInstanceOf(IllegalArgumentException.class);

        assertThat(outsideFile).exists();
    }

    @Test
    void url_WhenCalled_PrependsPublicBaseUrl() {
        LocalFileStorage storage = new LocalFileStorage(tempDir.toString(), PUBLIC_BASE_URL);

        String url = storage.url("news/2026/08/a3f9.jpg");

        assertThat(url).isEqualTo("/media/news/2026/08/a3f9.jpg");
    }

    private InputStream content(String text) {
        return new ByteArrayInputStream(text.getBytes(StandardCharsets.UTF_8));
    }
}
