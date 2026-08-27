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
    void exists_WhenFileStored_ReturnsTrue() {
        LocalFileStorage storage = new LocalFileStorage(tempDir.toString(), PUBLIC_BASE_URL);
        String key = storage.store(content("данные"), EXTENSION, CATEGORY);

        assertThat(storage.exists(key)).isTrue();
    }

    @Test
    void exists_WhenFileMissing_ReturnsFalse() {
        LocalFileStorage storage = new LocalFileStorage(tempDir.toString(), PUBLIC_BASE_URL);

        assertThat(storage.exists("news/2026/08/never-existed.jpg")).isFalse();
    }

    /**
     * Каталог существует как путь, но картинкой не является: приняв такой ключ,
     * сервис записал бы в базу ссылку, по которой нечего отдать.
     */
    @Test
    void exists_WhenKeyPointsToDirectory_ReturnsFalse() {
        LocalFileStorage storage = new LocalFileStorage(tempDir.toString(), PUBLIC_BASE_URL);
        String key = storage.store(content("данные"), EXTENSION, CATEGORY);
        String directoryKey = key.substring(0, key.lastIndexOf('/'));

        assertThat(tempDir.resolve(directoryKey)).isDirectory();
        assertThat(storage.exists(directoryKey)).isFalse();
    }

    /**
     * У проверки и у записи разные реакции на побег из хранилища: {@code delete} и
     * {@code store} обязаны падать, а вопрос «есть ли такой файл в хранилище» имеет
     * честный ответ «нет» — иначе кривой ключ из запроса давал бы 500 вместо 400.
     */
    @Test
    void exists_WhenKeyEscapesRoot_ReturnsFalseWithoutThrowing() throws Exception {
        Path root = tempDir.resolve("media");
        Files.writeString(tempDir.resolve("secret.yaml"), "секрет");
        LocalFileStorage storage = new LocalFileStorage(root.toString(), PUBLIC_BASE_URL);

        assertThat(storage.exists("../secret.yaml")).isFalse();
    }

    @Test
    void existsInCategory_WhenFileStoredInThatCategory_ReturnsTrue() {
        LocalFileStorage storage = new LocalFileStorage(tempDir.toString(), PUBLIC_BASE_URL);
        String key = storage.store(content("данные"), EXTENSION, "avatars");

        assertThat(storage.existsInCategory(key, "avatars")).isTrue();
    }

    @Test
    void existsInCategory_WhenFileStoredInOtherCategory_ReturnsFalse() {
        LocalFileStorage storage = new LocalFileStorage(tempDir.toString(), PUBLIC_BASE_URL);
        String key = storage.store(content("данные"), EXTENSION, CATEGORY);

        assertThat(storage.exists(key)).isTrue();
        assertThat(storage.existsInCategory(key, "avatars")).isFalse();
    }

    /**
     * Ключ начинается с нужного раздела, но уводит в соседний. Приняв такой ключ,
     * сервис записал бы в свою колонку чужой файл и удалил бы его при следующей правке.
     */
    @Test
    void existsInCategory_WhenKeyClimbsIntoOtherCategory_ReturnsFalse() {
        LocalFileStorage storage = new LocalFileStorage(tempDir.toString(), PUBLIC_BASE_URL);
        String foreignKey = storage.store(content("чужая обложка"), EXTENSION, CATEGORY);
        String disguisedKey = "avatars/../" + foreignKey;

        assertThat(storage.exists(disguisedKey)).isTrue();
        assertThat(storage.existsInCategory(disguisedKey, "avatars")).isFalse();
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
