# Миграция портала кафедры УИТС — план и трекер

> Единый источник правды по переписыванию действующего сайта на новый стек.
> Цель: **полный паритет функционала** действующего портала, на современном стеке, «по феншую».

- **Действующий сайт (эталон):** `stankinUits/uits_portal` — Django + Angular (проект из ВКР Маловой Я.И., 2025).
- **Новый сайт (этот репозиторий):** `UitsStankin/uits-stankin` — Spring Boot + React.

---

## 1. Стек: было → стало

| Слой | Действующий (Django) | Новый (Spring/React) |
|---|---|---|
| Backend | Django 4.2.5 + DRF 3.14 | Spring Boot 4.0.3, Java 21 |
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

Легенда: ✅ готово · 🟡 частично · ❌ нет

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
| 12 | Расписание экзаменов | ✅ | — (T-47: `GET /api/public/schedule/exams`, преподаватели с непустыми ссылками на PDF, проверка схемы URL при сохранении карточки) |
| 13 | Студенты (guidance) | ✅ | — (T-49: собственного интерфейса у модуля нет и в старом портале — приложение `guidance` без вьюх и без роутов; `Student` перенесён внутрь модуля 14 и наружу отдаётся только в составе записи аспирантуры) |
| 14 | Аспирантура (Postgraduate) | ✅ | — (T-49: `GET /api/public/postgraduates` с фильтрами по руководителю и специальности, CRUD модератору, студент заводится и удаляется вместе с записью) |
| 15 | Научные публикации + теги | ✅ | — (T-50a, T-50b: справочник тегов, карточки публикаций с фильтрами по тегу, автору и году, CRUD модератору; PDF в хранилище вместо base64 в базе. Хвост: загрузка PDF — T-50c) |
| 16 | Интеграция Google Scholar | ❌ | вызов SerpApi с пагинацией |
| 17 | Редактируемые Markdown-страницы (×13) | ✅ | — |
| 18 | Календарь событий | ❌ | сущность UserEvent (assigned_users, цвета, статусы) + CRUD |
| 19 | Напоминания (daily/weekly/monthly) | ❌ | планировщик + ручное уведомление |
| 20 | Telegram-бот (регистрация + уведомления) | ❌ | webhook, /register по коду, отправка |
| 21 | Загрузка файлов (аватары/превью) | ✅ | — (T-22, T-23, T-26, T-33: upload с ресайзом, превью новости, аватар карточки ППС и аватар учётной записи; файлы публикаций — часть модуля 15) |
| 22 | Подсистема ведомостей (Excel) | ❌ | парсинг студентов + генерация ведомостей |
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
