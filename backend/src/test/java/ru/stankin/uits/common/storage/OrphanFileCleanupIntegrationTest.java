package ru.stankin.uits.common.storage;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import ru.stankin.uits.AbstractIntegrationTest;
import ru.stankin.uits.TestRole;
import ru.stankin.uits.module.user.entity.User;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.FileTime;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.assertj.core.api.Assertions.assertThat;

class OrphanFileCleanupIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private OrphanFileCleanupTask cleanupTask;

    @Autowired
    private FileStorage fileStorage;

    @Test
    @DisplayName("Старый файл без единой ссылки в БД удаляется")
    void sweep_WhenOldFileIsUnreferenced_DeletesIt() throws IOException {
        String orphanKey = storeFile("news");
        makeOld(orphanKey);

        cleanupTask.sweep();

        assertThat(fileStorage.exists(orphanKey)).isFalse();
    }

    @Test
    @DisplayName("Старый файл, на который ссылается сущность, остаётся")
    void sweep_WhenOldFileIsReferenced_KeepsIt() throws IOException {
        String avatarKey = storeFile("avatars");
        makeOld(avatarKey);

        User user = createUser("avatar_owner", TestRole.USER);
        user.setAvatar(avatarKey);
        userRepository.save(user);

        cleanupTask.sweep();

        assertThat(fileStorage.exists(avatarKey)).isTrue();
    }

    @Test
    @DisplayName("Свежий файл без ссылок не трогается: модератор мог ещё не сохранить сущность")
    void sweep_WhenUnreferencedFileIsFresh_KeepsIt() throws IOException {
        String freshKey = storeFile("news");

        cleanupTask.sweep();

        assertThat(fileStorage.exists(freshKey)).isTrue();
    }

    private void makeOld(String key) throws IOException {
        Path file = STORAGE_ROOT.resolve(key);
        Files.setLastModifiedTime(file, FileTime.from(Instant.now().minus(25, ChronoUnit.HOURS)));
    }
}
