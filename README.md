<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/stankin-logo-white.png">
    <img src="docs/images/stankin-logo-black.png" width="440" alt="Логотип МГТУ «СТАНКИН»">
  </picture>
</p>

# Портал кафедры УИТС

[![CI](https://github.com/UitsStankin/uits-stankin/actions/workflows/ci.yml/badge.svg?branch=dev)](https://github.com/UitsStankin/uits-stankin/actions/workflows/ci.yml)

Сайт кафедры «Управление и информатика в технических системах» МГТУ «СТАНКИН»:
новости и объявления, карточки преподавателей, расписания, научные публикации,
корпоративный календарь с напоминаниями в Telegram.

Проект — переписывание действующего портала (Django + Angular) на новый стек
с целью **полного паритета функционала**. Что уже перенесено и что осталось —
в [матрице паритета](docs/MIGRATION.md#3-матрица-паритета-функционала).

---

## Стек

| Слой | Технологии |
|---|---|
| Backend | Spring Boot 4, Java 21, Spring Security (JWT), Spring Data JPA |
| БД | PostgreSQL 17, миграции — Liquibase |
| API | REST, документация — OpenAPI / Swagger UI |
| Тесты | JUnit 5, Spring Security Test, Testcontainers |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Парсинг расписания | Python-микросервис (FastAPI + pdfplumber) — планируется |
| Инфраструктура | Docker Compose, GitHub Actions (CI + деплой) |

---

## Структура репозитория

```
backend/    Spring Boot приложение — API портала
frontend/   React SPA
docs/       архитектура, план миграции, онбординг, бэклог
.github/    CI (сборка + тесты) и деплой
```

---

## Быстрый старт

Подробная инструкция с разбором переменных окружения и типовых ошибок —
в [backend/README.md](backend/README.md). Кратко:

```bash
cd backend
cp .env.example .env       # заполнить POSTGRES_PASSWORD и JWT_SECRET_KEY
docker compose up -d --wait
./gradlew bootRun
```

Проверка: `GET http://localhost:8080/api/public/news` отдаёт две новости
из сидера тестовых данных. Swagger UI — `http://localhost:8080/swagger-ui/index.html`.

Фронтенд поднимается отдельно из `frontend/` (`npm install && npm run dev`).

---

## Архитектурные решения

Зафиксированы в [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Ключевые:

* **JWT** вместо session/token-auth;
* напоминания — `@Scheduled` + outbox-таблица в PostgreSQL, без Celery/Redis/Quartz
  (минус два контейнера в деплое);
* Telegram-бот — webhook на Spring-эндпоинте, тонкий клиент `RestClient` к Bot API
  без сторонних библиотек;
* парсинг PDF-расписаний — отдельный Python-микросервис, переиспользующий
  проверенный `pdfplumber`-парсер;
* файлы (аватары, превью, PDF) — в хранилище, в БД только путь;
* имена таблиц повторяют схему Django-портала — для переноса данных `pg_dump`-ом.

---

## Статус

Проект в активной разработке. Готовы модули аутентификации (JWT, роли,
блокировка учёток) и профиля пользователя; частично — новости и карточки
преподавателей. Дорожная карта по фазам — в
[docs/MIGRATION.md](docs/MIGRATION.md#6-дорожная-карта-фазы), текущая очередь
задач — в [docs/BACKLOG.md](docs/BACKLOG.md).

---

## Документация

| Документ | Что внутри |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | принятые решения и их обоснования |
| [docs/MIGRATION.md](docs/MIGRATION.md) | план миграции, матрица паритета, карта данных |
| [docs/API.md](docs/API.md) | описание эндпоинтов API |
| [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md) | подходы к сложным частям (Telegram, расписание, файлы) |
| [docs/ONBOARDING.md](docs/ONBOARDING.md) | разбор кодовой базы для нового участника |
| [docs/GIT.md](docs/GIT.md) | соглашения по веткам, коммитам и PR |
| [docs/BACKLOG.md](docs/BACKLOG.md) | очередь задач |

Рабочий процесс: ветки от `dev`, PR в `dev`, слияние в `main` — релизное.
