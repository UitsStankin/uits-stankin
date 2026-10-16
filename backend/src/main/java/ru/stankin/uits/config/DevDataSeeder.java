package ru.stankin.uits.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import ru.stankin.uits.common.storage.FileStorage;
import ru.stankin.uits.module.achievements.entity.Achievement;
import ru.stankin.uits.module.achievements.repository.AchievementRepository;
import ru.stankin.uits.module.news.entity.ConferenceAnnouncement;
import ru.stankin.uits.module.news.entity.NewsPost;
import ru.stankin.uits.module.news.repository.ConferenceRepository;
import ru.stankin.uits.module.news.repository.NewsRepository;
import ru.stankin.uits.module.staff.entity.HelpersEmployee;
import ru.stankin.uits.module.staff.entity.Teacher;
import ru.stankin.uits.module.staff.enums.TeacherDegree;
import ru.stankin.uits.module.staff.enums.TeacherRank;
import ru.stankin.uits.module.staff.repository.HelpersEmployeeRepository;
import ru.stankin.uits.module.staff.repository.TeacherRepository;
import ru.stankin.uits.module.user.entity.User;
import ru.stankin.uits.module.user.repository.UserRepository;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;

/**
 * Наполняет пустую локальную базу тестовыми данными, чтобы сразу после
 * `docker compose up -d && gradlew bootRun` можно было залогиниться и
 * увидеть непустые списки. Работает только в профиле dev (активен локально
 * по умолчанию, см. spring.profiles.default в application.yaml); в тестах
 * (профиль test) и на проде (профиль prod) не запускается.
 *
 * Логины и пароли перечислены в backend/README.md, раздел «Тестовые данные».
 */
@Slf4j
@Component
@Profile("dev")
@RequiredArgsConstructor
public class DevDataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final TeacherRepository teacherRepository;
    private final HelpersEmployeeRepository helpersEmployeeRepository;
    private final NewsRepository newsRepository;
    private final ConferenceRepository conferenceRepository;
    private final AchievementRepository achievementRepository;
    private final FileStorage fileStorage;
    private final PasswordEncoder passwordEncoder;

    // Одна транзакция на весь сидинг: либо создаётся всё, либо ничего.
    // Без неё падение на середине оставляет в базе половину данных,
    // а проверка count() > 0 при следующем запуске молча пропустит сидинг.
    @Transactional
    @Override
    public void run(String... args) {
        // Сидинг только в пустую базу: повторный запуск ничего не дублирует
        if (userRepository.count() > 0) {
            log.info("DevDataSeeder: база не пуста, сидинг пользователей и контента пропущен");
            seedConferences();
            seedAchievements();
            return;
        }

        User admin = userRepository.save(User.builder()
                .username("admin")
                .password(passwordEncoder.encode("admin123"))
                .firstName("Андрей")
                .lastName("Администраторов")
                .email("admin@stankin.local")
                .superuser(true)
                .moderator(true)
                .staff(true)
                .build());

        userRepository.save(User.builder()
                .username("student")
                .password(passwordEncoder.encode("student123"))
                .firstName("Иван")
                .lastName("Студентов")
                .email("student@stankin.local")
                .build());

        User teacherUser1 = userRepository.save(User.builder()
                .username("teacher1")
                .password(passwordEncoder.encode("teacher123"))
                .firstName("Мария")
                .lastName("Иванова")
                .email("m.ivanova@stankin.local")
                .teacher(true)
                .build());

        User teacherUser2 = userRepository.save(User.builder()
                .username("teacher2")
                .password(passwordEncoder.encode("teacher123"))
                .firstName("Сергей")
                .lastName("Петров")
                .email("s.petrov@stankin.local")
                .teacher(true)
                .build());

        teacherRepository.save(Teacher.builder()
                .user(teacherUser1)
                .lastName("Иванова")
                .firstName("Мария")
                .patronymic("Петровна")
                .degree(TeacherDegree.CANDIDATE_TECH)
                .rank(TeacherRank.READER)
                .position("доцент кафедры информационных технологий")
                .bio("Читает курсы по базам данных и проектированию информационных систем.")
                .phoneNumber("+7 (499) 000-00-01")
                .email("m.ivanova@stankin.local")
                .education("МГТУ «СТАНКИН», факультет информационных технологий")
                .qualification("инженер-программист")
                .experience(15)
                .professionalExperience(12)
                .build());

        teacherRepository.save(Teacher.builder()
                .user(teacherUser2)
                .lastName("Петров")
                .firstName("Сергей")
                .patronymic("Николаевич")
                .degree(TeacherDegree.DOCTOR_TECH)
                .rank(TeacherRank.PROFESSOR)
                .position("заведующий кафедрой информационных технологий")
                .bio("Область научных интересов — автоматизация технологических процессов.")
                .phoneNumber("+7 (499) 000-00-02")
                .email("s.petrov@stankin.local")
                .education("МГТУ им. Н. Э. Баумана")
                .qualification("инженер")
                .experience(30)
                .professionalExperience(25)
                .build());

        teacherRepository.save(Teacher.builder()
                .lastName("Сидоров")
                .firstName("Олег")
                .patronymic("Иванович")
                .rank(TeacherRank.READER)
                .position("приглашённый преподаватель")
                .bio("Ведёт практикум по промышленной разработке.")
                .professionalExperience(8)
                .build());

        helpersEmployeeRepository.save(HelpersEmployee.builder()
                .lastName("Кузнецова")
                .firstName("Анна")
                .patronymic("Сергеевна")
                .position("инженер кафедры")
                .build());

        // createdAt задаётся явно, чтобы порядок в списке был предсказуемым
        // (@PrePersist проставляет время только если поле пустое)
        newsRepository.save(NewsPost.builder()
                .title("Добро пожаловать на новый портал УИТС")
                .shortDescription("Портал кафедры переехал на новую платформу.")
                .postType("news")
                .content("Запущена новая версия портала УИТС. Старые учётные записи "
                        + "будут перенесены автоматически, расписание и материалы кафедры "
                        + "появятся в ближайшее время.")
                .display(true)
                .author(admin)
                .createdAt(OffsetDateTime.now().minusDays(2))
                .build());

        newsRepository.save(NewsPost.builder()
                .title("Открыт приём заявок на курсовые проекты")
                .shortDescription("Темы курсовых проектов на осенний семестр опубликованы.")
                .postType("announcements")
                .content("Список тем курсовых проектов доступен на кафедре. Заявки "
                        + "принимаются до конца месяца, темы распределяются в порядке "
                        + "поступления заявок.")
                .display(true)
                .author(admin)
                .createdAt(OffsetDateTime.now().minusDays(1))
                .build());

        newsRepository.save(NewsPost.builder()
                .title("Черновик: скрытая запись для проверки флага display")
                .shortDescription("Не должна появляться в публичном списке новостей.")
                .postType("news")
                .content("Запись с display=false: публичный эндпоинт новостей обязан "
                        + "её отфильтровать. Если она видна — это баг.")
                .display(false)
                .author(admin)
                .createdAt(OffsetDateTime.now())
                .build());

        seedConferences();
        seedAchievements();

        log.info("DevDataSeeder: созданы пользователи admin, student, teacher1, teacher2 "
                + "(пароли — в backend/README.md), 3 преподавателя, 1 сотрудник УВП, "
                + "3 новости, 3 объявления о конференциях и 3 достижения кафедры");
    }

    /**
     * Отдельный предохранитель: общий на весь сидинг проверяет пользователей,
     * и в уже наполненную базу новая пачка данных иначе никогда бы не доехала.
     */
    private void seedConferences() {
        if (conferenceRepository.count() > 0) {
            return;
        }

        conferenceRepository.save(ConferenceAnnouncement.builder()
                .title("Информационные технологии в промышленности — 2026")
                .description("Ежегодная научно-практическая конференция кафедры.")
                .startDate(LocalDate.now().plusMonths(1))
                .endDate(LocalDate.now().plusMonths(1).plusDays(2))
                .time(LocalTime.of(10, 0))
                .organizer("кафедра УИТС, МГТУ «СТАНКИН»")
                .contactEmail("conf@stankin.ru")
                .contactPhone("+7 (499) 972-95-84")
                .content("<p>Приглашаем к участию преподавателей, аспирантов и студентов.</p>")
                .display(true)
                .createdAt(OffsetDateTime.now().minusDays(2))
                .build());

        conferenceRepository.save(ConferenceAnnouncement.builder()
                .title("Семинар по промышленной автоматизации")
                .description("Однодневный семинар: endDate = null, а не равный началу.")
                .startDate(LocalDate.now().plusWeeks(2))
                .time(LocalTime.of(14, 30))
                .organizer("кафедра УИТС")
                .display(true)
                .createdAt(OffsetDateTime.now().minusDays(1))
                .build());

        conferenceRepository.save(ConferenceAnnouncement.builder()
                .title("Черновик: скрытое объявление о конференции")
                .description("Не должно появляться в публичном списке конференций.")
                .display(false)
                .createdAt(OffsetDateTime.now())
                .build());
    }

    /**
     * Отдельный предохранитель — по тем же причинам, что и у конференций.
     */
    private void seedAchievements() {
        if (achievementRepository.count() > 0) {
            return;
        }

        Teacher teacher = teacherRepository.findAll().stream().findFirst().orElse(null);
        String previewImage = storePlaceholderImage();

        achievementRepository.save(Achievement.builder()
                .title("Победа в конкурсе «Инженер года»")
                .description("Преподаватель кафедры стал лауреатом всероссийского конкурса.")
                .content("<p>Награда присуждена за работы в области автоматизации "
                        + "технологических процессов.</p>")
                .previewImage(previewImage)
                .teacher(teacher)
                .display(true)
                .createdAt(OffsetDateTime.now().minusDays(2))
                .build());

        achievementRepository.save(Achievement.builder()
                .title("Грант на исследование цифровых двойников")
                .description("Достижение кафедры без привязки к преподавателю: teacherId = null.")
                .content("<p>Кафедра получила финансирование на трёхлетний исследовательский "
                        + "проект.</p>")
                .previewImage(previewImage)
                .display(true)
                .createdAt(OffsetDateTime.now().minusDays(1))
                .build());

        achievementRepository.save(Achievement.builder()
                .title("Черновик: скрытое достижение")
                .description("Не должно появляться в публичном списке достижений.")
                .content("<p>Запись с display=false: публичный эндпоинт обязан её отфильтровать.</p>")
                .previewImage(previewImage)
                .display(false)
                .createdAt(OffsetDateTime.now())
                .build());
    }

    private String storePlaceholderImage() {
        BufferedImage image = new BufferedImage(800, 450, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = image.createGraphics();
        graphics.setColor(new Color(0x1F3A5F));
        graphics.fillRect(0, 0, image.getWidth(), image.getHeight());
        graphics.dispose();

        ByteArrayOutputStream bytes = new ByteArrayOutputStream();

        try {
            ImageIO.write(image, "jpeg", bytes);
        } catch (IOException e) {
            throw new UncheckedIOException("Не удалось подготовить заглушку обложки", e);
        }

        return fileStorage.store(new ByteArrayInputStream(bytes.toByteArray()), "jpg", "achievements");
    }
}
