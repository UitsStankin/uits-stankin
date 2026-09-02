package ru.stankin.uits.common.storage;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import ru.stankin.uits.AbstractIntegrationTest;
import ru.stankin.uits.TestRole;
import ru.stankin.uits.module.news.entity.NewsPost;
import ru.stankin.uits.module.news.repository.NewsRepository;
import ru.stankin.uits.module.pages.entity.EditablePage;
import ru.stankin.uits.module.pages.repository.EditablePageRepository;
import ru.stankin.uits.module.publications.entity.ScientificPublication;
import ru.stankin.uits.module.publications.repository.PublicationRepository;
import ru.stankin.uits.module.staff.entity.Teacher;
import ru.stankin.uits.module.staff.repository.TeacherRepository;
import ru.stankin.uits.module.user.entity.User;

import java.io.IOException;
import java.util.List;
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

    @Autowired
    private NewsRepository newsRepository;

    @Autowired
    private PublicationRepository publicationRepository;

    @Autowired
    private EditablePageRepository editablePageRepository;

    @Autowired
    private TeacherRepository teacherRepository;

    // Таблица разделов не входит в TRUNCATE базового класса: разделы засеваются один раз
    // на весь контекст, поэтому изменённый текст возвращается вручную.
    @AfterEach
    void restoreEditableSection() {
        editablePageRepository.findBySlug("home-after").ifPresent(section -> {
            section.setText("");
            editablePageRepository.save(section);
        });
    }

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

    @Test
    @DisplayName("Картинка, вставленная в текст новости, не считается сиротой")
    void sweep_WhenFileIsUsedInsideRichTextContent_KeepsIt() throws IOException {
        String inlineKey = storeFile("news");
        makeOld(inlineKey);

        User author = createUser("inline_author", TestRole.ADMIN);
        newsRepository.save(NewsPost.builder()
                .title("Новость с картинкой в тексте")
                .shortDescription("Описание")
                .postType("news")
                .content("<p>Текст</p><img src=\"" + fileStorage.url(inlineKey) + "\">")
                .display(true)
                .author(author)
                .build());

        cleanupTask.sweep();

        assertThat(fileStorage.exists(inlineKey)).isTrue();
    }

    @Test
    @DisplayName("Картинка, вставленная в Markdown редактируемого раздела, не считается сиротой")
    void sweep_WhenFileIsUsedInsideEditablePageText_KeepsIt() throws IOException {
        String inlineKey = storeFile("news");
        makeOld(inlineKey);

        EditablePage section = editablePageRepository.findBySlug("home-after").orElseThrow();
        section.setText("![Схема корпуса](/media/" + inlineKey + ")");
        editablePageRepository.save(section);

        cleanupTask.sweep();

        assertThat(fileStorage.exists(inlineKey)).isTrue();
    }

    @Test
    @DisplayName("Картинка из блока «образование» карточки преподавателя не считается сиротой")
    void sweep_WhenFileIsUsedInsideTeacherEducation_KeepsIt() throws IOException {
        String inlineKey = storeFile("news");
        makeOld(inlineKey);

        teacherRepository.save(Teacher.builder()
                .lastName("Иванова")
                .firstName("Мария")
                .education("<p>МГТУ «Станкин»</p><img src=\"" + fileStorage.url(inlineKey) + "\">")
                .build());

        cleanupTask.sweep();

        assertThat(fileStorage.exists(inlineKey)).isTrue();
    }

    @Test
    @DisplayName("Картинка из блока «квалификация» карточки преподавателя не считается сиротой")
    void sweep_WhenFileIsUsedInsideTeacherQualification_KeepsIt() throws IOException {
        String inlineKey = storeFile("news");
        makeOld(inlineKey);

        teacherRepository.save(Teacher.builder()
                .lastName("Петрова")
                .firstName("Анна")
                .qualification("<p>Сертификат</p><img src=\"" + fileStorage.url(inlineKey) + "\">")
                .build());

        cleanupTask.sweep();

        assertThat(fileStorage.exists(inlineKey)).isTrue();
    }

    @Test
    @DisplayName("Раздел без владельца не подметается: удалять то, чью занятость спросить не у кого, нельзя")
    void sweep_WhenCategoryHasNoOwner_KeepsFile() throws IOException {
        String foreignKey = storeFile("reports");
        makeOld(foreignKey);

        cleanupTask.sweep();

        assertThat(fileStorage.exists(foreignKey)).isTrue();
    }

    @Test
    @DisplayName("PDF, привязанный к публикации, остаётся: раздел подметается, но файл занят")
    void sweep_WhenPublicationReferencesFile_KeepsIt() throws IOException {
        String pdfKey = storeFile("publications");
        makeOld(pdfKey);

        publicationRepository.save(ScientificPublication.builder()
                .name("Работа с приложенным PDF")
                .authors(List.of("Тестов Т.Т."))
                .description("Описание")
                .source("Сборник")
                .year(2025)
                .file(pdfKey)
                .build());

        cleanupTask.sweep();

        assertThat(fileStorage.exists(pdfKey)).isTrue();
    }

    @Test
    @DisplayName("PDF без карточки удаляется: раздел публикаций теперь подметается")
    void sweep_WhenPublicationFileIsUnreferenced_DeletesIt() throws IOException {
        String pdfKey = storeFile("publications");
        makeOld(pdfKey);

        cleanupTask.sweep();

        assertThat(fileStorage.exists(pdfKey)).isFalse();
    }

    private void makeOld(String key) throws IOException {
        Path file = STORAGE_ROOT.resolve(key);
        Files.setLastModifiedTime(file, FileTime.from(Instant.now().minus(25, ChronoUnit.HOURS)));
    }
}
