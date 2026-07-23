# UITS Backend

Бэкенд портала УИТС: Spring Boot 4, Java 21, PostgreSQL 15.
Схема базы — миграции Liquibase, аутентификация — JWT.

Фронтенд лежит в соседней папке `frontend/` и поднимается отдельно.

---

## Требования

* **Docker Desktop** — запущенный, в нём поднимается PostgreSQL;
* **JDK 21** — любая сборка (Temurin, Corretto, Liberica);
* Gradle ставить не нужно, в репозитории лежит wrapper (`gradlew`).

Все команды ниже выполняются **из папки `backend`**.

---

## Запуск

### 1. Переменные окружения

Скопировать шаблон:

```powershell
Copy-Item .env.example .env
```

Файл `.env` в git не попадает (он в `.gitignore`) — он локальный, у каждого разработчика свой.

В нём нужно заполнить два значения.

**`POSTGRES_PASSWORD`** — любой пароль, только латиница и цифры: символы `#`, `\`, `$` и кавычки ломают разбор файла (почему — см. раздел «Переменные»).

**`JWT_SECRET_KEY`** — этим ключом подписываются токены. Требования жёсткие: **строка в Base64, дающая не меньше 32 байт**. Короче или не Base64 — приложение стартует нормально, но упадёт при первом логине.

Сгенерировать в PowerShell:

```powershell
$b = New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); [Convert]::ToBase64String($b)
```

Или в Git Bash:

```bash
openssl rand -base64 32
```

Остальные переменные можно оставить как есть.

### 2. База данных

```powershell
docker compose up -d --wait
```

`--wait` не отдаёт управление, пока healthcheck контейнера не подтвердит, что база принимает подключения по TCP. Без него можно попасть в момент, когда PostgreSQL ещё инициализируется, и получить `connection refused` на ровном месте.

### 3. Приложение

```powershell
.\gradlew.bat bootRun
```

Готово, когда в логе появится `Started UitsPortalApplication`.

### 4. Проверка

```powershell
Invoke-RestMethod http://localhost:8080/api/public/news
```

Эндпоинт открыт без авторизации. Пустой список — нормально: база чистая.

---

## Переменные

| Переменная | Что это | Обязательна | Пример |
|---|---|---|---|
| `POSTGRES_DB` | имя базы | нет, по умолчанию `uits_db` | `uits_db` |
| `POSTGRES_USER` | пользователь базы | да | `uits_stankin_db` |
| `POSTGRES_PASSWORD` | его пароль | да | `localdevpass123` |
| `POSTGRES_HOST_PORT` | порт на хост-машине | нет, по умолчанию `5433` | `5433` |
| `JWT_SECRET_KEY` | ключ подписи токенов, Base64 ≥ 32 байт | да | `nZ8s...=` |
| `JWT_EXPIRATION` | время жизни токена в миллисекундах | нет, по умолчанию сутки | `86400000` |

Внутри контейнера PostgreSQL всегда слушает порт 5432. `POSTGRES_HOST_PORT` — это порт снаружи, на хост-машине. Значение 5433 выбрано, чтобы не конфликтовать с PostgreSQL, установленным в систему напрямую.

### Кто читает `.env`

Файл читают **два разных потребителя**, и это важно учитывать:

1. **Docker Compose** — подставляет значения в `docker-compose.yml` при создании контейнера;
2. **Spring** — потому что в `application.yaml` прописано `spring.config.import: optional:file:.env[.properties]`.

Отсюда два следствия:

* путь `file:.env` относительный, поэтому **`gradlew` нужно запускать из папки `backend`** — иначе Spring файл не найдёт;
* Spring разбирает `.env` по правилам `.properties`. Значит `#` начинает комментарий, `\` экранирует следующий символ, `${...}` разворачивается как подстановка, а кавычки не снимаются и попадают внутрь значения. Поэтому пароль — простой, без спецсимволов.

Префикс `optional:` означает «файла может не быть». Это обязательно: в CI и на проде `.env` отсутствует, настройки приходят туда переменными окружения (`SPRING_DATASOURCE_URL` и прочие), которые у Spring приоритетнее любых файлов.

---

## Полный сброс базы

```powershell
docker compose down -v
```

⚠️ **Флаг `-v` удаляет том вместе со всеми данными** — пользователями, новостями, всем. Если что-то нужно сохранить, сначала нужно сделать дамп.

Когда это требуется: **пока том существует, переменные `POSTGRES_USER` и `POSTGRES_PASSWORD` на базу не влияют.** Образ PostgreSQL применяет их только один раз — при создании пустого кластера. Если креды в `.env` изменены, контейнер перезапущен, а вход по-прежнему работает по старым — нужен именно сброс тома, а не `restart`.

После сброса:

```powershell
docker compose up -d --wait
```

---

## Если не запускается

| Сообщение | Причина и что делать |
|---|---|
| `Could not resolve placeholder 'POSTGRES_...'` | Spring не нашёл `.env`. Проверить, что файл существует и что команда запущена из папки `backend`. |
| `variable is not set. Defaulting to a blank string` | Compose не нашёл `.env` рядом с `docker-compose.yml`. Скопировать `.env.example`. |
| `FATAL: role "..." does not exist` | Том создан со старыми кредами. Нужен `docker compose down -v`. |
| `password authentication failed` | То же самое, вид сбоку: том старый, `.env` новый. |
| `port is already allocated` | Порт 5433 занят. Изменить `POSTGRES_HOST_PORT` в `.env` и пересоздать контейнер. |
| `DecodingException` или `WeakKeyException` при логине | `JWT_SECRET_KEY` не является Base64 или короче 32 байт. Сгенерировать заново. |
| `Cannot connect to the Docker daemon` | Docker Desktop не запущен. |

Посмотреть, что происходит с базой:

```powershell
docker compose logs postgres
```

Посмотреть результат последних проверок healthcheck:

```powershell
docker inspect --format "{{json .State.Health}}" uits_postgres
```

---

## Тесты

```powershell
.\gradlew.bat test
```

Интеграционные тесты поднимают **собственный** контейнер PostgreSQL через Testcontainers и подставляют свои настройки. Локальная база и `.env` им не нужны — но Docker должен быть запущен.

---

## Полезные адреса

| Адрес | Что это |
|---|---|
| `http://localhost:8080` | приложение |
| `http://localhost:8080/api/public/news` | публичный эндпоинт, годится для проверки живости |
| `http://localhost:8080/api/users/auth/login` | вход, `POST` |
| `http://localhost:8080/swagger-ui.html` | Swagger UI — сейчас может не открываться, версия springdoc отстаёт от Spring Boot 4 (тикет T-10 в [BACKLOG.md](../docs/BACKLOG.md)) |

---

## Документация проекта

Всё остальное — в [`docs/`](../docs): архитектурные решения, матрица паритета со старым порталом, разбор кодовой базы и текущий бэклог.
