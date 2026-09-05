# Миграция портала кафедры УИТС — план и трекер

> Единый источник правды по переписыванию действующего сайта на новый стек.
> Цель: **полный паритет функционала** действующего портала, на современном стеке, «по феншую».

- **Действующий сайт (эталон):** `stankinUits/uits_portal` — Django + Angular (проект из ВКР Маловой Я.И., 2025).
- **Новый сайт (этот репозиторий):** `UitsStankin/uits-stankin` — Spring Boot + React.

---

## 1. Стек: было → стало

| Слой | Действующий (Django) | Новый (Spring/React) |
|---|---|---|
| Backend | Django 4.2.5 + DRF 3.14 | Spring Boot 4.1.1, Java 21 |
| Auth | dj-rest-auth + allauth (**token**) | **JWT** (jjwt) |
| Async / напоминания | Celery 5.4 + Redis | **Spring `@Scheduled` + outbox в Postgres** (без Redis/Quartz — [ARCHITECTURE.md](ARCHITECTURE.md) §4.2) |
| Telegram | pyTelegramBotAPI (webhook) | **тонкий клиент `RestClient` → Bot API** (webhook — [ARCHITECTURE.md](ARCHITECTURE.md) §4.3) |
| Парсинг расписания | pdfplumber | **Python FastAPI микросервис** (`schedule-service/`) |
| Парсинг Excel (ведомости) | pandas / openpyxl | Apache POI (или тот же микросервис) |
| Rich-text / Markdown | django-quill / mdeditor | React-редактор (TipTap / md-editor) |
| Изображения | django-imagekit | Thumbnailator + файловое/объектное хранилище |
| Публикации | SerpApi (requests) | WebClient/RestClient → SerpApi |
| Frontend | Angular 14 (шаблон espire), NGXS | React 19, Vite, Tailwind 4, React Query, Zustand |
| **Админка** | **Django Admin** (бесплатно) | **Кастомная React-админка** (делаем руками!) |
| БД | PostgreSQL 15 | PostgreSQL **17** + Liquibase (не копировать 15: EOL 11.2027, `pg_dump` переносится между мажорами) |

> ⚠️ **Главный скрытый объём:** в Django админка для всех моделей есть «из коробки». В новом стеке её нет — CRUD-интерфейсы для каждой сущности придётся писать вручную. Это самый трудоёмкий пласт миграции.

---

## 2. Архитектурные решения (зафиксированы)

1. **JWT** вместо token-auth (уже сделано) — оставляем.
2. **Расписание → отдельный Python-микросервис** (FastAPI), переиспользует рабочий `pdfplumber`-парсер; Spring дёргает по HTTP. _(решение пользователя, 2026-06-17)_
3. **Напоминания → `@Scheduled`/Quartz**, без Celery+Redis (минус 2 контейнера в деплое).
4. **Telegram-бот → webhook** на Spring-эндпоинте с проверкой секрет-токена.
5. **Файлы** (аватары, превью, PDF) — не в БД base64, а в хранилище; в БД только путь.
6. **Контент** (новости, достижения, конференции) — rich-text; редактируемые разделы — Markdown.

---

## 3. Матрица паритета функционала

Легенда: ✅ готово · 🟡 частично · ❌ нет · ⛔ снято решением (см. ARCHITECTURE §8)

| # | Модуль действующего сайта | Статус в новом | Что доделать |
|---|---|---|---|
| 1 | Аутентификация (login) | ✅ | — (T-30: пара access/refresh вместо одного суточного токена, серверный выход с отзывом семейства, ротация с детекцией повторного использования, смена пароля обрывает выданные токены, rate limit на входе) |
| 2 | Профиль + смена пароля | ✅ | — (T-33: `PUT /api/users/profile` — имя, фамилия, аватар; логин и почта из ЛК не правятся, как и в старом портале, где сериализатор держал их read-only) |
| 3 | Роли (admin/moderator/teacher/user) | ✅ | — |
| 4 | Новости / Объявления | ✅ | — |
| 5 | Объявления о конференциях | ✅ | — (T-28: сущность, CRUD, публичный список, даты проведения и контакты) |
| 6 | Достижения кафедры | ✅ | — (T-29: сущность с FK на преподавателя, CRUD, публичный список, достижения одного преподавателя) |
| 7 | Преподаватели (ППС) | ✅ | — (T-26: карточка до паритета, CRUD, «моя карточка» `/api/teachers/me`) |
| 8 | УВП (учебно-вспом. персонал) | ✅ | — (T-27: карточка, публичный список, модераторский CRUD) |
| 9 | Дисциплины (Subject) | ✅ | — (T-26: сущность, M2M-связь, список и создание) |
| 10 | Расписание преподавателя | ✅ | — (T-39…T-42a: парсер PDF и HTTP-обёртка в микросервисе, таблицы и модель, импорт `POST /api/teachers/{id}/schedule/import`, публичное чтение `GET /api/public/teachers/{id}/schedule`) |
| 11 | Сводное расписание | ✅ | — (T-42b: `GET /api/public/schedule`, массив расписаний с повторяемым фильтром `?teacherId=`, имя преподавателя в теле, выборка одним запросом) |
| 12 | Расписание экзаменов | ✅ | — (T-47: `GET /api/public/exams/files`, преподаватели с непустыми ссылками на PDF, проверка схемы URL при сохранении карточки). Сверх паритета закрыт блок T-48: PDF экзаменов разбирается в данные, `GET /api/public/exams` отдаёт их с фильтром по группе — в оригинале экзамены были только картинкой в `iframe` |
| 13 | Студенты (guidance) | ✅ | — (T-49: собственного интерфейса у модуля нет и в старом портале — приложение `guidance` без вьюх и без роутов; `Student` перенесён внутрь модуля 14 и наружу отдаётся только в составе записи аспирантуры) |
| 14 | Аспирантура (Postgraduate) | ✅ | — (T-49: `GET /api/public/postgraduates` с фильтрами по руководителю и специальности, CRUD модератору, студент заводится и удаляется вместе с записью) |
| 15 | Научные публикации + теги | ✅ | — (T-50a, T-50b: справочник тегов, карточки публикаций с фильтрами по тегу, автору и году, список уникальных авторов для фильтра, CRUD модератору; PDF в хранилище вместо base64 в базе, загрузка через `POST /api/files` — T-50c) |
| 16 | Интеграция Google Scholar | ❌ | вызов SerpApi с пагинацией. Модуль даёт заготовки карточек при заполнении каталога публикаций (заголовок, ссылка, сниппет), остальные поля всё равно вводятся руками. При переносе закрыть три дыры: доступ был у любого залогиненного, хотя инструмент модераторский; обход страниц выдачи шёл циклом без ограничения и выжигал платную квоту одним запросом; имя подставлялось в URL без экранирования (§7, п. 5) |
| 17 | Редактируемые Markdown-страницы (×13) | ✅ | — |
| 18 | Календарь событий | ✅ | — (T-53a…T-53c: `UserEvent` с владельцем и назначенными, CRUD преподавателю и админу, выдача «моё или мне назначено» без дублей, фильтр `?status=`; `next_notification_at` — обычная колонка, баг §7.2 закрыт) |
| 19 | Напоминания (daily/weekly/monthly) | ⛔ | снято решением (ARCHITECTURE §8, пункт 14) вместе с модулем 20: напоминание без канала доставки бессмысленно |
| 20 | Telegram-бот (регистрация + уведомления) | ⛔ | снято решением (ARCHITECTURE §8, пункт 14): webhook требует живого HTTPS, которого нет, а уведомлять некого — пользователей у портала нет |
| 21 | Загрузка файлов (аватары/превью) | ✅ | — (T-22, T-23, T-26, T-33: upload с ресайзом, превью новости, аватар карточки ППС и аватар учётной записи; файлы публикаций — часть модуля 15) |
| 22 | Подсистема ведомостей (Excel) | ✅ | — (блок T-66: `POST /parse-gradesheet` в микросервисе, схема и импорт книги по ведомости на лист, чтение для админки, сопоставление с ППС и справочником дисциплин; T-68: шапка ведомости хранится целиком). Две части исходного объёма сняты решениями, а не забыты: генерация бланков (ARCHITECTURE §8, пункт 13 — их выдаёт система университета, а в оригинале генератор был нерабочим) и показ оценок студентам (пункт 12 — учётных записей у студентов нет) |
| 23 | **Админ-панель (CRUD всех сущностей)** | ❌ | каркас + страницы под каждую сущность |

Список 13 Markdown-страниц (слаги): `fields-of-study`, `contacts`, `documents-department`, `documents-university`, `bachelor-edu-plans`, `bachelor-graduate`, `bachelor-practices`, `master-edu-plans`, `master-graduate`, `master-practices`, `scientific-activity-postgraduate`, `home-before`, `home-after`.

Последние два — не страницы: собственного адреса у них нет, они рисуются
на главной над и под лентой новостей. **Самой титульной страницы в матрице
нет** — здесь перечислены модули, а главная модулем не считалась, и в план
переноса она не попала вовсе. Пробел закрыт тикетом F-17 (фронт, 2026-08-29);
из старого портала эти два слага не читались никогда, поэтому в базе они
пустые, и содержимое главной ещё предстоит наполнить — заготовка лежит
в [FRONTEND_BACKLOG.md](FRONTEND_BACKLOG.md), блок 2.

---

## 4. Карта данных (сущности к переносу)

- **User** — AbstractUser + avatar, is_moderator, is_teacher, teacher(OneToOne), telegram_code _(генерировать ОДИН раз — см. баги)_.
- **Teacher** — last/first/patronymic, контакты (phone/email/messenger), degree+rank (**enum**), position, experience, professional_experience, education, qualification, bio, subjects(M2M), exam_schedule_graduation/non_graduation (URL), avatar.
- **HelpersEmployee (УВП)** — фио + должность + avatar.
- **Subject** — дисциплина.
- **Schedule** (OneToOne Teacher) → **ScheduleLesson** (class_time 1–8, week_number 1–6, group, name, type, cabinet, subgroup) → **ScheduleLessonDate** (start/end `DD.MM`, alternatively_period).
- **Student** — фио, group, education_level (enum), speciality, diploma_theme, admission_year.
- **Postgraduate** — student(FK) ↔ teacher(FK).
- **Post** — title, short_description, post_type (NEWS/ANNOUNCEMENT), preview_image(+thumbnail), content(rich), display, author. **Announcement**, **ConferenceAnnouncement** (даты/организатор/контакты/content).
- **Achievement** — title, description, content(rich), image, is_published, teacher(FK, `SET NULL`). В новой схеме колонки названы `preview_image` и `display` — как у новостей и конференций; смысл прежний, перенос данных требует явного маппинга этих двух колонок.
- **Tag**, **ScientificPublication** — name, author(JSON), description, url, file, tags(M2M), year, source, pages, vol_n, isbn, uuid.
- **EditablePage** — title, text(Markdown), page(slug, unique), timestamps.
- **UserEvent** — name, description, started/ended_at, all_day, assigned_users(M2M), color, user(FK), start_notified, notification_frequency (enum), next_notification_at, status (enum).
- **TelegramUser** — user_id, username, chat_id, assigned_user(OneToOne), last_notification_time.
- **Подсистема ведомостей:** CodeDirection, Discipline, LessonType, Teacher(name), Group, Semester, GroupCourse, Student(parse), OutputForParcingModuleGrade.

> В новом репозитории имена таблиц повторяют Django (`users_user`, `news_post`, `employee_teacher`) — сохраняем конвенцию для совместимости миграции данных.

### 4.1 Карта колонок «Django → новая схема»

Составлена 2026-09-01 (T-55a) по исходникам старого портала — репозиторий
`stankinUits/uits_portal`, ветка `master` — и по сущностям нового (`@Table`,
`@Column`). **Дампа старого прода на момент составления нет**, поэтому карта
описывает схемы, а не данные: объёмы, грязь, кодировки, значения
последовательностей и форма JSON-полей сверяются отдельно, первым шагом T-55b.
Возможное расхождение прода с репозиторием (накатили не всё) — тоже вопрос
к дампу.

**Имена таблиц сходятся полностью.** Django собирает имя как
`<app_label>_<model>`, и все шестнадцать переносимых таблиц совпадают
с `@Table` нового портала буква в букву. Проверено отдельно: `db_table`
и `db_column` не переопределены ни в одной модели переносимых приложений,
`RenameField` и `RenameModel` в 22 файлах миграций не встречаются. Единственное
исключение — `parcing_data_from_excel` (модуль 22), который не переносится.

#### Что переносится

Девятнадцать таблиц: шестнадцать обычных и три связочные (M2M) — у каждой
связочной, как и в Django, собственная колонка `id`.

| Новая таблица | Модель старого портала |
|---|---|
| `users_user` | `users.User` (AbstractUser + четыре своих поля) |
| `employee_teacher` | `department/employee.Teacher` |
| `employee_helpersemployee` | `department/employee.HelpersEmployee` |
| `subject_subject` | `department/employee/subject.Subject` |
| `employee_teacher_subjects` | M2M `Teacher.subjects` |
| `guidance_student` | `department/employee/guidance.Student` |
| `postgraduate_postgraduate` | `department/employee/postgraduate.Postgraduate` |
| `schedule_schedule` | `department/employee/schedule.Schedule` |
| `schedule_schedulelesson` | `…schedule.ScheduleLesson` |
| `schedule_schedulelessondate` | `…schedule.ScheduleLessonDate` |
| `news_post` | `department/news.Post` |
| `news_conferenceannouncement` | `department/news.ConferenceAnnouncement` |
| `achievements_achievement` | `department/achievements.Achievement` |
| `scientific_publications_tag` | `department/scientific_publications.Tag` |
| `scientific_publications_scientificpublication` | `…ScientificPublication` |
| `scientific_publications_scientificpublication_tags` | M2M `ScientificPublication.tags` |
| `editable_pages_editablepage` | `editable_pages.EditablePage` |
| `events_userevent` | `events.UserEvent` |
| `events_userevent_assigned_users` | M2M `UserEvent.assigned_users` |

**Наши таблицы без источника** — заполнять нечем и не нужно: `refresh_token`
(сессии, сущность нового портала), `schedule_exam` и `schedule_examschedule`
(T-48, разобранные PDF; в старом портале лежали только ссылки на файлы).

**Таблицы старого портала, которые не переносятся:** `tg_bot_*` (модуль 20),
`excel_export_*` и `parcing_data_from_excel_*` (модуль 22), `news_announcement`
(модель `Announcement` — два поля, ни одного соответствия в новой схеме;
по дампу проверить, есть ли в ней строки вообще), `users_user_groups`
и `users_user_user_permissions`, `auth_*` и служебные `django_*`.

#### Пять общих правил

Действуют на все таблицы, дальше в разборе на них ссылки по номеру.

1. **Пустая строка вместо NULL.** Django избегает NULL в строковых полях:
   `blank=True` без `null=True` даёт NOT NULL со значением `''`. Так устроены
   `first_name`, `last_name` и `email` в `AbstractUser`. Новая схема на их месте
   ждёт `null`, и код проекта различает «не заполнено» и «пустая строка»
   (в API пустые строки нормализуются в `null` отдельным десериализатором).
   Все необязательные строковые колонки переносить через `nullif(col, '')`.
2. **Медиа: путь и раздел.** Django хранит путь относительно `MEDIA_ROOT`,
   новый портал — ключ вида `<раздел>/<год>/<месяц>/<uuid>.<расширение>`,
   и разделов всего четыре: `avatars`, `news`, `achievements`, `publications`.
   Принадлежность ключа разделу проверяется при **записи** карточки: форма
   правки отправляет ключ обратно (правило T-44), и ключ не из своего раздела
   даёт `400`. То есть неверный префикс ломается не при переносе, а при первой
   же правке карточки. Соответствие префиксов — в таблице ниже.
3. **Quill.** Содержимое `content` у новостей, конференций и достижений лежит
   JSON-строкой `{"delta": …, "html": …}`. В новую колонку идёт только `html`
   и обязательно через санитайзер: старой базе не доверяем. Маппинг 1:1 покажет
   посетителю JSON целиком.
4. **Значения enum'ов.** В Django они строковые, в нижнем регистре или
   по-русски, в новой схеме — латиница в верхнем. Раскладываются `case`-ом
   при переносе, списки — в разборе соответствующих таблиц.
5. **Ширины только росли.** Ни одна колонка новой схемы не уже старой
   (`email` карточки ППС 50 → 254, `organizer` конференции 100 → 255,
   `contact_phone` 20 → 32, ФИО УВП 50 → 150). Усечения при переносе не будет,
   проверять нечего.

**Медиа-префиксы:**

| Старый `upload_to` | Что там лежит | Новый раздел | Действие |
|---|---|---|---|
| `avatars/%Y/%m/%d` | фото ППС и УВП | `avatars` | ключ переносится как есть: префикс уже совпадает, лишний сегмент дня проверке раздела не мешает |
| `photos/avatars/%Y/%m/%d` | аватары учётных записей | `avatars` | файлы перенести в `avatars/…`, колонку переписать |
| `photos/%Y/%m/%d` | превью новостей **и** картинки достижений | `news` и `achievements` | один префикс на две сущности: раскладывать по разделам **по ссылающейся таблице**, а не пакетным переименованием префикса |
| `conference_images/%Y/%m/%d` | превью конференций | `news` | конференции в новом портале хранят файлы в разделе `news` |

#### Таблица за таблицей

Перечислены все колонки: 1:1 списком, остальные — построчно с указанием, что
делать. Числовая сверка (`information_schema.columns` против этой карты)
делается на живой базе первым шагом T-55b.

**`users_user`**

1:1: `id`, `password` (проверка старого хеша и перехеширование — T-55c, сделано),
`last_login`, `is_superuser`, `username`, `is_staff`, `is_active`, `date_joined`,
`is_moderator`, `is_teacher`.

| Колонка | Что делать |
|---|---|
| `first_name`, `last_name`, `email` | правило 1 |
| `avatar` | правило 2, префикс `photos/avatars/` |
| `telegram_code` | переносить `NULL`: значение бессмысленно, старый `save()` перегенерировал код при каждом сохранении (§7, п. 1), а модуль 20 не перенесён |
| `teacher_id` | **в `users_user` не переносится**, см. следующий абзац |
| — → `tokens_not_before` | колонки в старом портале нет, при переносе `NULL` — «сессии не отзывались» |

**Связь учётки и карточки ППС развёрнута.** В Django `OneToOneField` объявлен
на пользователе (`users_user.teacher_id`), в новой схеме — на карточке
(`employee_teacher.user_id`). Перенос делается после обеих таблиц:

```sql
update employee_teacher t set user_id = u.id
from users_user u where u.teacher_id = t.id;
```

Роли в старом портале лежат и булевыми флагами, и в `users_user_groups` →
`auth_group`. Новая схема знает только флаги. Перед переносом проверить
по дампу, что в группах нет прав, которых нет во флагах; если есть — это
находка, а не деталь переноса.

**`employee_teacher`**

1:1: `id`, `last_name`, `first_name`, `patronymic`, `phone_number`, `messenger`,
`degree`, `rank`, `position`, `experience`, `professional_experience`, `bio`,
`exam_schedule_graduation`, `exam_schedule_non_graduation`.

| Колонка | Что делать |
|---|---|
| `email` | правило 1 |
| `avatar` | правило 2, префикс совпадает |
| `education`, `qualification` | rich-text HTML, но не Quill: переносятся как есть и через санитайзер (правило 3, без разбора JSON) |
| — → `user_id` | заполняется из `users_user.teacher_id`, см. выше |

Коды `degree` и `rank` совпадают буква в букву, включая `READER` вместо
`DOCENT` — ради этого они и сохранены.

**`employee_helpersemployee`** — 1:1 целиком: `id`, `last_name`, `first_name`,
`patronymic`, `position`, `avatar` (правило 2, префикс совпадает).

**`subject_subject`** — 1:1 целиком: `id`, `name`, `description`.

**`employee_teacher_subjects`** — 1:1 целиком: `id`, `teacher_id`, `subject_id`.

**`guidance_student`**

1:1: `id`, `last_name`, `first_name`, `group`, `admission_year`.

| Колонка | Что делать |
|---|---|
| `education_level` | правило 4, значения по-русски: `Бакалавриат` → `BACHELOR`, `Магистратура` → `MASTER`, `Аспирантура` → `POSTGRADUATE`, `Специалитет` → `SPECIALIST` |
| `patronymic`, `speciality`, `diploma_theme` | правило 1 |

**`postgraduate_postgraduate`** — 1:1 целиком: `id`, `student_id`, `teacher_id`.

**`schedule_schedule`** — 1:1 целиком: `id`, `teacher_id`, `imported_file_name`.

**`schedule_schedulelesson`** — 1:1 целиком: `id`, `schedule_id`, `class_time`,
`week_number`, `group`, `name`, `type`, `cabinet`, `subgroup`.

**`schedule_schedulelessondate`** — 1:1 целиком: `id`, `lesson_id`, `start_date`,
`end_date`, `alternatively_period`. Строковые даты `ДД.ММ` переносятся как есть:
года в исходном PDF нет и восстановить его нечем (T-41a).

**`news_post`**

1:1: `id`, `title`, `short_description`, `preview_image_description`,
`created_at`, `display`, `author_id`.

| Колонка | Что делать |
|---|---|
| `post_type` | правило 4, но **не простым нижним регистром**: старые значения `NEWS` и `ANNOUNCEMENT`, новые — `news` и `announcements`. Наивный `lower()` даст `announcement`, которого нет в словаре `PostType`: запись перестанет открываться в форме правки (`400` по `@Pattern`) и выпадет из фильтра `?postType=` |
| `content` | правило 3 |
| `preview_image` | правило 2, префикс `photos/` → раздел `news` |
| — → `preview_thumbnail` | **источника нет**: в старом портале миниатюра — `ImageSpecField`, вычисляемое поле imagekit, колонки под неё в базе не существует. При импорте либо генерировать миниатюру самим, как это делает загрузка новости (T-52c), либо оставить `NULL` — фронт умеет без неё |

**`news_conferenceannouncement`**

1:1: `id`, `title`, `description`, `start_date`, `end_date`, `time`,
`created_at`, `preview_image_description`.

| Колонка | Что делать |
|---|---|
| `is_hidden` → `display` | переименование **с инверсией**: `display = not is_hidden`. Скопировать значение как есть — значит спрятать всё опубликованное и показать всё скрытое |
| `content` | правило 3 |
| `preview_image` | правило 2, префикс `conference_images/` → раздел `news` |
| `organizer`, `contact_email`, `contact_phone` | правило 1 |

**`achievements_achievement`**

1:1: `id`, `title`, `description`, `created_at`, `teacher_id`.

| Колонка | Что делать |
|---|---|
| `image` → `preview_image` | переименование плюс правило 2: префикс `photos/` → раздел `achievements` |
| `is_published` → `display` | переименование, полярность та же |
| `content` | правило 3 |

**`scientific_publications_tag`** — 1:1 по колонкам: `id`, `name`. Но новая схема
держит уникальность имени без учёта регистра (`uq_tag_name_lower`, changeset 028):
дубликаты вида «НИР»/«нир» перед вставкой схлопнуть в один тег и перевесить ссылки
в `scientific_publications_scientificpublication_tags`.

**`scientific_publications_scientificpublication`**

1:1: `id`, `name`, `description`, `year`, `source`.

| Колонка | Что делать |
|---|---|
| `author` | колонка `jsonb` оставлена под перенос специально (T-50b). Форму массива — строки или объекты — проверить по дампу: в модели это `JSONField` без схемы |
| `file` | в старой базе PDF лежит **base64-строкой в TEXT**. Декодировать в файл раздела `publications`, в колонку класть ключ: новая колонка — 100 символов, целый base64 туда не влезет физически |
| `id_for_unique_identify_component` | в новой схеме колонки нет. В моделях старого портала на неё никто не ссылается; перед тем как выбросить, проверить, не ходит ли по ней фронт старого сайта |
| `url`, `pages`, `vol_n`, `isbn` | правило 1 |

**`scientific_publications_scientificpublication_tags`** — 1:1 целиком:
`id`, `scientificpublication_id`, `tag_id`.

**`editable_pages_editablepage`**

1:1: `title`, `text`, `page`, `created_at`, `modified_at`.

| Колонка | Что делать |
|---|---|
| `id` | **не переносится**, см. ниже |

Единственная таблица, куда нельзя вставлять. Тринадцать разделов уже созданы
ченджсетом Liquibase, `page` уникален, и `INSERT` упадёт на конфликте. Импорт
делается `UPDATE … WHERE page = <слаг>`. Слаги сверить поимённо (решение T-25),
а не полагаться на порядок строк; слаг старого портала, которого нет у нас, —
находка: либо забытый раздел, либо мусор.

**`events_userevent`**

1:1: `id`, `name`, `started_at`, `ended_at`, `all_day`, `user_id` (владелец),
`start_notified`.

| Колонка | Что делать |
|---|---|
| `notification_frequency` | правило 4: `daily` / `weekly` / `monthly` / `none` → `DAILY` / `WEEKLY` / `MONTHLY` / `NONE` |
| `status` | правило 4: `not_started` / `in_progress` / `completed` → `NOT_STARTED` / `IN_PROGRESS` / `COMPLETED` |
| `next_notification_at` | переносить `NULL`. В старой модели поле объявлено `auto_now=True` и затиралось «сейчас» при каждом сохранении (§7, п. 2) — в базе лежит время последней правки записи, а не время напоминания |
| `color` | старый валидатор проверял только первый символ, новая схема требует `^#[0-9a-fA-F]{6}$`. Значения вне шаблона чинить при импорте — иначе событие нельзя будет сохранить из формы |
| `description` | правило 1 |

**`events_userevent_assigned_users`** — 1:1 целиком: `id`, `userevent_id`,
`user_id`.

#### Что остаётся дампу

Карта описывает схемы. По дампу проверяются: реальные объёмы по таблицам,
грязь в данных (цвета событий, кодировки, битые Quill-строки), форма массива
`author` у публикаций, наличие строк в `news_announcement` и прав в
`auth_group`, фактическое состояние прод-схемы против репозитория, значения
последовательностей и размер тома медиа. Это первый шаг T-55b: писать скрипт
без дампа всё равно нельзя.

---

## 5. Сложные части — подход к переносу

### 5.1 Telegram-бот
Действующий: webhook + `telebot`. Пользователь берёт `telegram_code` из ЛК → `/register <код>` боту → создаётся связь `TelegramUser(chat_id ↔ user)`. Webhook защищён заголовком `X-Telegram-Bot-Api-Secret-Token`.
Новый: тонкий клиент `RestClient` к Bot API (библиотека не нужна — ARCHITECTURE.md §4.3), `@PostMapping` webhook + проверка секрета, команды `/start /register /cancel`, отправка через outbox + `@Async`.

### 5.2 Расписание (микросервис)
`schedule-service/` (FastAPI): эндпоинт `POST /parse` принимает PDF, возвращает JSON. **Сделано в T-39/T-40**, контракт и разбор формата — в `schedule-service/README.md`; ответ — плоский список занятий (`{lessons: [...]}` с `week_day`/`class_time`), а не дерево дней. Фиксы старого парсера выполнены: таблицы берутся со всех страниц, незнакомый формат даёт структурированную `422`, подгруппы больше не затираются кабинетами вида `0804(КК)`. Spring-сторона закрыта в T-41a…T-42b: таблицы `Schedule/ScheduleLesson/ScheduleLessonDate`, клиент к микросервису, импорт PDF модератором и публичные ручки — расписание одного преподавателя и сводное. Незакрытый долг блока — образ микросервиса в прод-контуре (T-17d).

### 5.3 Напоминания
`@Scheduled` (cron; Quartz не берём, состояние и так в БД — ARCHITECTURE.md §4.2): задачи выбирают события с `next_notification_at <= now` и шлют в Telegram назначенным через outbox. **Не** копировать баг `auto_now` на поле планирования.

### 5.4 Google Scholar (SerpApi)
`WebClient` → `engine=google_scholar&q=<urlencoded имя>`; пагинация по `serpapi_pagination.next`; ключ из конфигурации; маппинг в DTO. Файлы публикаций — в хранилище, не base64 в БД.

---

## 6. Дорожная карта (фазы)

- **Фаза 0 — Фундамент:** секреты из git + ротация; CORS по доменам; модель Teacher до паритета; загрузка файлов; контракт API (OpenAPI) с фронтендером.
- **Фаза 1 — Контент + каркас админки:** новости (rich-text, CRUD), конференции, достижения, 13 Markdown-страниц, дисциплины; каркас React-админки.
- **Фаза 2 — ППС и расписание:** полная карточка преподавателя, УВП, расписание экзаменов; микросервис парсинга; сводное расписание.
- **Фаза 3 — Корпоративная часть:** календарь событий → планировщик → Telegram-бот (вместе).
- **Фаза 4 — Наука:** публикации + теги + Scholar.
- **Фаза 5 — Ведомости:** подсистема Excel parse/export (можно отложить/вынести).

---

## 7. Баги действующего кода — НЕ переносить, исправить

1. `User.save()` пересоздаёт `telegram_code` при каждом сохранении → ломает привязку. Генерировать один раз.
2. `UserEvent.next_notification_at = auto_now=True` затирает плановую дату. Убрать `auto_now`.
3. Парсер расписания берёт только последнюю страницу PDF (цикл перезаписывает `table`).
4. Celery-интервалы фиксированы в секундах, «месяц» = 28 дней — переделать на нормальное расписание.
5. SerpApi: `q={name}` без urlencode + ключ в URL — экранировать, вынести ключ.
6. Публикации хранят PDF как base64 в `TEXT` — выносить в хранилище.
7. Десятки `print()`-отладок и сырые потоки на каждый апдейт/сообщение — заменить на логгер/`@Async`.
8. `update_profile` писал всё, что не перечислено в `read_only_fields`, включая `is_staff` (любой пользователь мог выдать себе доступ в Django-админку) и `telegram_code`; заодно позволял менять `username` — то есть логин. В новом портале из ЛК правятся только имя, фамилия и аватар; логин и почта из профиля не меняются.

---

## 8. Безопасность (применить к новому репо сразу)

- ~~Убрать `backend/.env` из git-истории~~ — проверено 2026-07-27: `backend/.env` в историю
  не попадал (`git log --all -- '*.env'` находит только `.env.example`), чистка истории не требуется.
  `POSTGRES_PASSWORD` и `JWT_SECRET_KEY` **ротированы локально 2026-07-27**; прод-значения — только
  в GitHub Actions Secrets, файл `.env` на сервере должен создаваться деплоем (T-09).
- Сузить CORS в `SecurityConfig` до доменов фронтенда.
- Проверить `@PreAuthorize` на всех непубличных эндпоинтах.

---

## 9. Целевая структура репозитория

```
uits-stankin/
├── backend/            # Spring Boot (модули: auth, user, news, staff, schedule, events, telegram, publications, pages, ...)
├── frontend/           # React (public-зона + админка)
├── schedule-service/   # Python FastAPI: парсинг расписания
├── docs/MIGRATION.md   # этот файл
└── docker-compose*.yml
```

---

_Обновляйте матрицу паритета (раздел 3) по мере переноса модулей._
