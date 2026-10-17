<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/stankin-logo-white.png">
    <img src="docs/images/stankin-logo-black.png" width="440" alt="Логотип МГТУ «СТАНКИН»">
  </picture>
</p>

# Портал кафедры УИТС

[![backend CI](https://github.com/UitsStankin/uits-stankin/actions/workflows/ci.yml/badge.svg?branch=dev)](https://github.com/UitsStankin/uits-stankin/actions/workflows/ci.yml)
[![schedule-service CI](https://github.com/UitsStankin/uits-stankin/actions/workflows/schedule-service.yml/badge.svg?branch=dev)](https://github.com/UitsStankin/uits-stankin/actions/workflows/schedule-service.yml)
[![frontend CI](https://github.com/UitsStankin/uits-stankin/actions/workflows/frontend.yml/badge.svg?branch=dev)](https://github.com/UitsStankin/uits-stankin/actions/workflows/frontend.yml)
[![Quality Gate](https://sonarcloud.io/api/project_badges/measure?project=UitsStankin_uits-stankin&metric=alert_status)](https://sonarcloud.io/summary/overall?id=UitsStankin_uits-stankin)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=UitsStankin_uits-stankin&metric=coverage)](https://sonarcloud.io/component_measures?id=UitsStankin_uits-stankin&metric=coverage)

Сайт кафедры «Управление и информатика в технических системах» МГТУ «СТАНКИН»:
новости и объявления, карточки преподавателей, расписания, научные публикации,
корпоративный календарь событий.

Проект — переписывание действующего портала (Django + Angular) на новый стек
с целью **полного паритета функционала**. Что уже перенесено и что осталось —
в [матрице паритета](docs/MIGRATION.md#3-матрица-паритета-функционала).

---

## Стек

| Слой | Технологии |
|---|---|
| Backend | Spring Boot 4.1, Java 21, Spring Security (access + refresh JWT), Spring Data JPA |
| БД | PostgreSQL 17, миграции — Liquibase |
| API | REST, документация — OpenAPI / Swagger UI |
| Тесты | JUnit 5, Spring Security Test, Testcontainers |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Парсинг расписания | Python-микросервис: FastAPI, pdfplumber, pytest |
| Инфраструктура | Docker Compose, nginx + Let's Encrypt, GitHub Actions (CI + деплой), rclone (облачные копии бэкапов) |

---

## Структура репозитория

```
backend/           Spring Boot приложение — API портала; прод-compose и ops/ (бэкапы)
frontend/          React SPA; Dockerfile и nginx.conf прод-образа
schedule-service/  Python-микросервис: разбор PDF-расписаний и Excel-ведомостей
docs/              архитектура, план миграции, онбординг, бэклог, порядок деплоя
.github/           CI (сборка + тесты) и деплой
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

Compose поднимает базу и `schedule-service` (первый запуск собирает его образ).
Проверка: `GET http://localhost:8080/api/public/news` отдаёт две новости
из сидера тестовых данных. Swagger UI — `http://localhost:8080/swagger-ui/index.html`,
микросервис расписаний — `http://localhost:8000/docs`.

Фронтенд поднимается отдельно из `frontend/` (`npm install && npm run dev`).

---

## Архитектурные решения

Зафиксированы в [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Ключевые:

* **JWT** вместо session/token-auth: короткий access-токен в памяти клиента
  и refresh в httpOnly-cookie, сессии хранятся в БД — иначе отозвать выданный
  токен нечем;
* разбор PDF-расписаний и Excel-ведомостей — отдельный Python-микросервис;
  для PDF он переиспользует проверенный `pdfplumber`-парсер;
* файлы (аватары, превью, PDF) — в хранилище, в БД только ключ;
* прод — Docker Compose на одном VPS: nginx с запечённым фронтендом и TLS, backend, postgres
  и микросервис, образы по sha коммита из GHCR;
* бэкапы — ночной дамп базы и архив медиа на сервере плюс зашифрованная копия в облачном
  хранилище: бэкап на том же диске, что и база, не спасает от потери машины;
* имена таблиц повторяют схему Django-портала — для переноса данных `pg_dump`-ом.

---

## Стенд

Портал выкачен на один VPS (Ubuntu 24.04, 2 vCPU / 4 ГБ): `https://168-113-168-29.sslip.io`.
Это стенд без реальных пользователей; настоящий домен ещё не куплен, поэтому имя бесплатное,
из сервиса `sslip.io`.

* **Деплой.** Слияние PR из `dev` в `main` запускает `deploy.yml`: тесты, сборка трёх образов
  в GHCR с тегом `sha` коммита, запись `.env` на сервер из секретов environment `production`,
  `docker compose up -d --wait`. Откат — правка `IMAGE_TAG` и `up -d`: образы прежнего релиза
  остаются на сервере.
* **TLS.** nginx терминирует https, сертификат Let's Encrypt продлевается недельным cron.
* **Бэкапы.** Каждую ночь дамп базы и архив медиа ложатся в `/opt/uits/backups` (хранение
  14 дней), через полчаса зашифрованная копия (`rclone crypt`) уходит в приватный бакет S3
  (хранение 30 дней). Восстановление из облачной копии проверено.
* **Сервер.** `fail2ban`, вход под root только по ключу, автоматические обновления безопасности.

Порядок выкатки, настройка сервера, ротация секретов, откат и бэкапы — в
[docs/DEPLOY.md](docs/DEPLOY.md). Не сделано: настоящий домен, оповещение об упавшем бэкапе,
наблюдаемость (T-97), первый администратор в боевой базе (T-87; на стенде заведён вручную)
и перенос данных старого портала (T-55b, T-55d — ждут дампа).

---

## Статус

Проект в активной разработке; паритет со старым порталом — **20 модулей из 21**.
Счёт ведётся по актуальному объёму: два модуля исходного списка сняты решением
(напоминания и Telegram-бот, T-71). Открыт модуль 23, админ-панель — он целиком фронтовый.

Фаза 1 бэкенда закрыта: аутентификация (пара access/refresh, роли, блокировка
учёток, ограничение попыток входа), профиль и смена пароля, новости и объявления,
конференции, достижения кафедры, карточки ППС и УВП, дисциплины, 13 редактируемых
Markdown-страниц, загрузка файлов с фоновой уборкой неиспользованных.

Фаза 2 закрыта целиком: расписание преподавателя и сводное (разбор PDF живёт
в отдельном Python-микросервисе, Spring хранит разобранные пары, модератор
загружает файл) и расписание экзаменов. Следом перенесены аспирантура, научные
публикации с тегами и PDF, календарь событий с назначением коллег.

Фронтенд: работают вход, профиль со сменой пароля и карточкой ППС преподавателя,
главная страница, лента новостей со страницей новости и раздел объявлений.
В админке (`/admin`) есть каркас, редактор текста, загрузка файлов и управление новостями,
преподавателями и УВП; остальные разделы админки и контентные страницы — в работе.

Перенесённый код прошёл **два сплошных аудита**: шесть проходов
по классам дыр (XSS вне rich-text, владение объектом против роли, состав ответов,
стоимость запроса, транзакции против внешних эффектов, версии зависимостей)
и второй заход по восьми направлениям с фиксами одним пакетом. Разбор находок
и решений — в [docs/BACKLOG.md](docs/BACKLOG.md), разделы T-54 и T-58…T-65. Карта фаз —
в [docs/MIGRATION.md](docs/MIGRATION.md#6-дорожная-карта-фазы), очередь задач
бэкенда — там же в бэклоге, фронтенда —
в [docs/FRONTEND_BACKLOG.md](docs/FRONTEND_BACKLOG.md).

---

## Документация

| Документ | Что внутри |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | принятые решения и их обоснования |
| [docs/MIGRATION.md](docs/MIGRATION.md) | план миграции, матрица паритета, карта данных |
| [docs/API.md](docs/API.md) | описание эндпоинтов API |
| [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md) | подходы к сложным частям (расписание, файлы, ведомости) |
| [docs/DEPLOY.md](docs/DEPLOY.md) | боевой стенд: подготовка сервера, секреты, деплой, откат, TLS, бэкапы |
| [docs/ONBOARDING.md](docs/ONBOARDING.md) | разбор кодовой базы для нового участника |
| [docs/GIT.md](docs/GIT.md) | типы сообщений коммитов |
| [docs/BACKLOG.md](docs/BACKLOG.md) | очередь задач бэкенда |
| [docs/FRONTEND_BACKLOG.md](docs/FRONTEND_BACKLOG.md) | очередь задач фронтенда |

Рабочий процесс: ветки от `dev`, PR в `dev`, слияние в `main` — релизное и запускает деплой
на стенд (правки одних только `.md` его не запускают).
