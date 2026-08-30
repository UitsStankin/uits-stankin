package ru.stankin.uits;

import com.tngtech.archunit.base.DescribedPredicate;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

import static com.tngtech.archunit.core.domain.JavaClass.Predicates.resideInAPackage;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noFields;
import static com.tngtech.archunit.library.dependencies.SlicesRuleDefinition.slices;

/**
 * Архитектурные правила проекта (T-13).
 *
 * <p>Раскладка по пакетам (module.news, module.user, … с подпакетами controller,
 * service, repository, entity, dto, mapper)
 * сама по себе ничего не гарантирует: компилятор не мешает контроллеру дёрнуть
 * репозиторий или сущности утечь в чужой модуль. Эти тесты превращают договорённости
 * о слоях в проверяемые правила: нарушение — красный тест в CI, а не замечание на ревью.
 *
 * <p>ArchUnit читает байткод из classpath (без запуска Spring-контекста, поэтому
 * тесты — обычные unit, секунды), строит граф зависимостей между классами
 * и прогоняет по нему правила. Анализируются и классы, сгенерированные MapStruct
 * (NewsMapperImpl и т.п.), — их зависимости тоже часть архитектуры.
 *
 * <p>Тестовые классы из анализа исключены ({@link ImportOption.DoNotIncludeTests}):
 * интеграционные тесты легально инжектят репозитории и создают сущности напрямую.
 *
 * <p>Каждое исключение в правилах — зафиксированное решение, а не удобство;
 * обоснование — в комментарии рядом. Новое исключение добавляется только вместе
 * с объяснением, почему связь легальна.
 */
@AnalyzeClasses(packages = "ru.stankin.uits", importOptions = ImportOption.DoNotIncludeTests.class)
class ArchitectureTest {

    /**
     * Правило 1. Контроллер не обращается к репозиторию напрямую.
     *
     * <p>Путь к данным — только через сервис: там живут транзакции
     * ({@code @Transactional}) и бизнес-проверки. Контроллер, дёргающий репозиторий,
     * работает вне транзакции и в обход правил предметной области.
     */
    @ArchTest
    static final ArchRule controllersDoNotUseRepositories =
            noClasses().that().resideInAPackage("..controller..")
                    .should().dependOnClassesThat().resideInAPackage("..repository..")
                    .because("контроллер ходит к данным только через сервис — "
                            + "иначе запрос выполняется вне транзакции и мимо бизнес-логики");

    /**
     * Правило 2. DTO не зависят от JPA-сущностей.
     *
     * <p>DTO — это контракт API из docs/API.md. Сущность в DTO означает, что смена
     * схемы БД молча меняет контракт, а сериализация ленивых полей тянет
     * LazyInitializationException наружу. Преобразование entity → DTO — работа мапперов.
     */
    @ArchTest
    static final ArchRule dtosDoNotDependOnEntities =
            noClasses().that().resideInAPackage("..dto..")
                    .should().dependOnClassesThat().resideInAPackage("..entity..")
                    .because("DTO — контракт API: сущность внутри DTO привязывает контракт "
                            + "к схеме БД, преобразованием занимаются мапперы");

    /**
     * Правило 3. Репозитории не знают о DTO.
     *
     * <p>Репозиторий — слой хранения, его язык — сущности. DTO в сигнатуре репозитория
     * означает, что контракт API просочился до самого нижнего слоя и любое изменение
     * ответа ручки потребует править запросы к БД.
     */
    @ArchTest
    static final ArchRule repositoriesDoNotDependOnDtos =
            noClasses().that().resideInAPackage("..repository..")
                    .should().dependOnClassesThat().resideInAPackage("..dto..")
                    .because("репозиторий работает с сущностями; DTO на этом уровне — "
                            + "утечка контракта API в слой хранения");

    /**
     * Правило 4а. Сущности user не расползаются по проекту.
     *
     * <p>User — центральная сущность, на неё завязаны FK других модулей и вся
     * безопасность, поэтому список допущенных к ней пакетов длинный, но закрытый.
     * Каждая строка — осознанное решение; расширение списка — событие ревью,
     * а не правка «чтобы скомпилировалось».
     */
    @ArchTest
    static final ArchRule userEntitiesLeaveModuleOnlyByAgreedPaths =
            classes().that().resideInAPackage("..module.user.entity..")
                    .should().onlyHaveDependentClassesThat().resideInAnyPackage(
                            // собственный модуль
                            "..module.user..",
                            // FK-связи: у новости есть автор, у преподавателя — учётная запись
                            "..module.news.entity..",
                            "..module.staff.entity..",
                            // событие календаря принадлежит владельцу и назначено участникам
                            "..module.events.entity..",
                            // мапперы собирают authorName и ФИО преподавателя из полей User
                            // (зависимость появляется в сгенерированных MapStruct-реализациях)
                            "..module.news.mapper..",
                            "..module.staff.mapper..",
                            "..module.events.mapper..",
                            // NewsService достаёт текущего пользователя из SecurityContext,
                            // чтобы проставить автора создаваемой новости
                            "..module.news.service..",
                            // владелец и назначенные приезжают в сервис календаря учётными записями
                            "..module.events.service..",
                            // логин достаёт id пользователя для обновления last_login
                            "..module.auth.controller..",
                            // сессия принадлежит пользователю: FK refresh_token.user_id
                            // и отзыв всех сессий учётки при смене пароля
                            "..module.auth.entity..",
                            "..module.auth.service..",
                            // безопасность построена вокруг User: SecurityUser оборачивает
                            // сущность, CustomUserDetailsService её загружает
                            "..security..",
                            // DevDataSeeder наполняет пустую dev-базу тестовыми данными
                            "..config.."
                    )
                    .because("каждый новый потребитель User расширяет поверхность, "
                            + "которую ломает изменение центральной сущности, — "
                            + "список допущенных пакетов закрыт и меняется только осознанно");

    /**
     * Правило 4б. Сущности news не покидают свой модуль.
     * Исключение одно — DevDataSeeder (см. правило 4а).
     */
    @ArchTest
    static final ArchRule newsEntitiesStayInTheirModule =
            classes().that().resideInAPackage("..module.news.entity..")
                    .should().onlyHaveDependentClassesThat().resideInAnyPackage(
                            "..module.news..",
                            "..config.."
                    )
                    .because("NewsPost — внутренняя модель модуля новостей, "
                            + "наружу отдаются только DTO");

    /**
     * Правило 4в. Сущности staff не покидают свой модуль.
     * Исключения — DevDataSeeder (см. правило 4а) и модуль достижений.
     *
     * <p>Достижение кафедры привязано к преподавателю (FK на employee_teacher),
     * и связь эта — ровно того же рода, что «у новости есть автор» из правила 4а:
     * сущность нужна и самой связи, и мапперу, собирающему ФИО в ответ.
     * Достижения ходят к Teacher только на чтение и только через
     * {@code TeacherService} — репозиторий staff им недоступен.
     */
    @ArchTest
    static final ArchRule staffEntitiesStayInTheirModule =
            classes().that().resideInAPackage("..module.staff.entity..")
                    .should().onlyHaveDependentClassesThat().resideInAnyPackage(
                            "..module.staff..",
                            "..module.achievements.entity..",
                            "..module.achievements.mapper..",
                            "..module.achievements.service..",
                            "..module.schedule.entity..",
                            "..module.schedule.mapper..",
                            "..module.schedule.service..",
                            "..module.students.entity..",
                            "..module.students.mapper..",
                            "..module.students.service..",
                            "..config.."
                    )
                    .because("Teacher — внутренняя модель модуля staff, "
                            + "наружу отдаются только DTO");

    /**
     * Правило 4д. Сущности achievements не покидают свой модуль.
     * Исключение одно — DevDataSeeder (см. правило 4а).
     */
    @ArchTest
    static final ArchRule achievementEntitiesStayInTheirModule =
            classes().that().resideInAPackage("..module.achievements.entity..")
                    .should().onlyHaveDependentClassesThat().resideInAnyPackage(
                            "..module.achievements..",
                            "..config.."
                    )
                    .because("Achievement — внутренняя модель модуля достижений, "
                            + "наружу отдаются только DTO");

    /**
     * Правило 4г. Сущности pages не покидают свой модуль.
     *
     * <p>Исключения {@code ..config..} здесь нет, в отличие от новостей и staff:
     * тринадцать разделов создаёт ченджсет Liquibase, а не {@code DevDataSeeder},
     * поэтому за пределами модуля {@code EditablePage} не нужен никому.
     */
    @ArchTest
    static final ArchRule pagesEntitiesStayInTheirModule =
            classes().that().resideInAPackage("..module.pages.entity..")
                    .should().onlyHaveDependentClassesThat().resideInAPackage("..module.pages..")
                    .because("EditablePage — внутренняя модель модуля страниц, "
                            + "наружу отдаются только DTO");

    /**
     * Правило 6. Файловая система — только внутри common.storage.
     *
     * <p>Смысл интерфейса {@code FileStorage} в том, что смена хранилища (диск → S3)
     * стоит одного нового класса. Сервис, который сам дёрнет {@code Files.copy} или
     * соберёт путь через {@code Path}, эту гарантию отменяет: при переезде его придётся
     * искать и переписывать. Правило превращает договорённость в красный тест.
     */
    @ArchTest
    static final ArchRule fileSystemAccessStaysInStorage =
            noClasses().that().resideOutsideOfPackage("..common.storage..")
                    .should().dependOnClassesThat().resideInAPackage("java.nio.file..")
                    .because("работа с диском спрятана за FileStorage — иначе переезд "
                            + "на объектное хранилище потребует правок в бизнес-коде");

    /**
     * Правило 5. Модули не лезут во внутренности друг друга.
     *
     * <p>Каждый пакет module.* — срез (slice); по умолчанию срезам запрещено
     * зависеть друг от друга. Разрешены ровно два вида связей:
     * <ul>
     *   <li>auth → user.service: auth — тонкий фасад логина над модулем user,
     *       после аутентификации он обновляет last_login через UserService
     *       (сервис — публичная граница модуля, в отличие от репозитория);</li>
     *   <li>* → user.entity: FK-связи и сборка имён; кто именно допущен —
     *       точечно ограничивает правило 4а, здесь дубль не нужен.</li>
     *   <li>achievements → staff.entity и staff.service: достижение привязано
     *       к преподавателю. Сущность — ради FK и ФИО в ответе, сервис — потому
     *       что публичная граница модуля staff одна, и это он, а не репозиторий.</li>
     *   <li>schedule → staff.entity и staff.enums: расписание принадлежит преподавателю
     *       (FK на employee_teacher), связь того же рода, что у достижений; enum
     *       ExamScheduleType описывает поля карточки ППС и потому живёт в staff,
     *       а ручка расписания экзаменов принимает его параметром запроса.</li>
     *   <li>student → staff.entity и staff.service: запись аспирантуры связывает
     *       студента с руководителем (FK на employee_teacher), ФИО руководителя
     *       едет в ответ, а существование преподавателя проверяется через
     *       TeacherService — как у достижений и расписания.</li>
     *   <li>events → user.service: назначенные на событие приходят списком id,
     *       и существование учёток проверяется через UserService — как модуль
     *       достижений проверяет преподавателя через TeacherService.</li>
     * </ul>
     */
    @ArchTest
    static final ArchRule modulesDoNotDependOnEachOther =
            slices().matching("ru.stankin.uits.module.(*)..")
                    .should().notDependOnEachOther()
                    .ignoreDependency(
                            resideInAPackage("..module.auth.."),
                            resideInAPackage("..module.user.service.."))
                    .ignoreDependency(
                            resideInAPackage("..module.events.service.."),
                            resideInAPackage("..module.user.service.."))
                    .ignoreDependency(
                            DescribedPredicate.alwaysTrue(),
                            resideInAPackage("..module.user.entity.."))
                    .ignoreDependency(
                            resideInAPackage("..module.achievements.."),
                            resideInAPackage("..module.staff.entity.."))
                    .ignoreDependency(
                            resideInAPackage("..module.achievements.service.."),
                            resideInAPackage("..module.staff.service.."))
                    .ignoreDependency(
                            resideInAPackage("..module.schedule.."),
                            resideInAPackage("..module.staff.entity.."))
                    .ignoreDependency(
                            resideInAPackage("..module.schedule.."),
                            resideInAPackage("..module.staff.enums.."))
                    .ignoreDependency(
                            resideInAPackage("..module.schedule.service.."),
                            resideInAPackage("..module.staff.service.."))
                    .ignoreDependency(
                            resideInAPackage("..module.students.."),
                            resideInAPackage("..module.staff.entity.."))
                    .ignoreDependency(
                            resideInAPackage("..module.students.service.."),
                            resideInAPackage("..module.staff.service.."))
                    .because("границы модулей — сервисы и DTO; прямой доступ к чужим "
                            + "внутренностям превращает модули обратно в один клубок");

    /**
     * Правило 7. Секреты учётной записи не попадают в DTO ответов.
     *
     * <p>Пароль, код привязки Telegram, хеш refresh-токена и граница живых сессий
     * наружу не отдаются ни в каком виде. Проверка глазами работает ровно до
     * следующего модуля: поля Telegram появятся вместе с модулем 20, и вспомнить
     * про них будет некому. Request-DTO исключены: пароль как раз принимают форма
     * создания учётной записи и смена пароля (T-54c).
     */
    @ArchTest
    static final ArchRule dtosDoNotCarryAccountSecrets =
            noFields().that().areDeclaredInClassesThat().resideInAPackage("..dto..")
                    .and().areDeclaredInClassesThat().haveSimpleNameNotEndingWith("Request")
                    .and().areDeclaredInClassesThat().haveSimpleNameNotEndingWith("RequestDto")
                    .should().haveNameMatching("password|telegramCode|tokenHash|tokensNotBefore")
                    .because("это секреты учётной записи: в ответ они не уходят, "
                            + "а правило ловит это на сборке, а не на ревью новой ручки");
}
