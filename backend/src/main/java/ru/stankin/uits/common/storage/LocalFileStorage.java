package ru.stankin.uits.common.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;

/**
 * Файлы на диске приложения. Корень — {@code application.storage.root}: локально папка
 * в проекте, в контейнере — смонтированный том.
 *
 * <p>Каталог создаётся при старте, и неудача роняет приложение: иначе сервис поднялся бы
 * здоровым и падал на каждой загрузке. Ключи проверяются на выход за пределы корня.
 */
@Component
public class LocalFileStorage implements FileStorage {
    private final Path root;
    private final String publicBaseUrl;

    public LocalFileStorage(@Value("${application.storage.root}") String root,
                            @Value("${application.storage.public-base-url}") String publicBaseUrl) {
        this.root = Path.of(root).toAbsolutePath().normalize();
        this.publicBaseUrl = publicBaseUrl;

        try {
            Files.createDirectories(this.root);
        } catch (IOException e) {
            throw new IllegalStateException("Не удалось создать каталог хранилища: " + this.root, e);
        }
    }

    @Override
    public String store(InputStream data, String extension, String category) {
        String fileName = UUID.randomUUID() + "." + extension;
        String datePath = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy/MM"));
        String key = category + "/" + datePath + "/" + fileName;

        Path target = resolveAndVerify(key);

        try {
            Files.createDirectories(target.getParent());
            Files.copy(data, target);
        } catch (IOException e) {
            throw new IllegalStateException("Не удалось сохранить файл: " + key, e);
        }

        return key;
    }

    @Override
    public String storeVariant(String baseKey, String suffix, InputStream data) {
        String key = variantKey(baseKey, suffix);
        Path target = resolveAndVerify(key);

        try {
            Files.createDirectories(target.getParent());
            Files.copy(data, target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new IllegalStateException("Не удалось сохранить файл: " + key, e);
        }

        return key;
    }

    @Override
    public String variantKey(String baseKey, String suffix) {
        int dot = baseKey.lastIndexOf('.');

        return dot < 0
                ? baseKey + suffix
                : baseKey.substring(0, dot) + suffix + baseKey.substring(dot);
    }

    @Override
    public void delete(String key) {
        Path target = resolveAndVerify(key);

        try {
            Files.deleteIfExists(target);
        } catch (IOException e) {
            throw new IllegalStateException("Не удалось удалить файл: " + key, e);
        }
    }

    @Override
    public boolean exists(String key) {
        Path target = resolve(key);
        return isInsideRoot(target) && Files.isRegularFile(target);
    }

    @Override
    public List<StoredFile> listFiles() {
        try (Stream<Path> paths = Files.walk(root)) {
            return paths
                    .filter(Files::isRegularFile)
                    .map(this::toStoredFile)
                    .toList();
        } catch (IOException e) {
            throw new IllegalStateException("Не удалось обойти хранилище: " + root, e);
        }
    }

    private StoredFile toStoredFile(Path file) {
        String key = root.relativize(file).toString().replace('\\', '/');

        try {
            return new StoredFile(key, Files.getLastModifiedTime(file).toInstant());
        } catch (IOException e) {
            throw new UncheckedIOException("Не удалось прочитать время изменения: " + key, e);
        }
    }

    @Override
    public boolean existsInCategory(String key, String category) {
        Path target = resolve(key);
        Path categoryRoot = root.resolve(category).normalize();

        return target.startsWith(categoryRoot) && Files.isRegularFile(target);
    }

    @Override
    public String url(String key) {
        return publicBaseUrl + "/" + key;
    }

    private Path resolve(String key) {
        return root.resolve(key).normalize();
    }

    private boolean isInsideRoot(Path target) {
        return target.startsWith(root);
    }

    private Path resolveAndVerify(String key) {
        Path target = resolve(key);
        if (!isInsideRoot(target)) {
            throw new IllegalArgumentException("Ключ выходит за пределы хранилища: " + key);
        }
        return target;
    }
}
