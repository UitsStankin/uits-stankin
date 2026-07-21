# Онбординг: как устроен этот проект

> Документ для того, чтобы **понять собственный код** — каждый файл и каждую строку.
> Написан 2026-07-21 после четырёхмесячного перерыва. Читается сверху вниз за один заход.
>
> Связанные документы: [ARCHITECTURE.md](ARCHITECTURE.md) — принятые решения и почему;
> [MIGRATION.md](MIGRATION.md) — матрица паритета со старым порталом;
> [IMPLEMENTATION.md](IMPLEMENTATION.md) — как делать конкретные сложные куски;
> [BACKLOG.md](BACKLOG.md) — что делать прямо сейчас, разложенное на тикеты.

---

## 0. Как пользоваться этим документом

Главное правило проекта: **не мержишь то, что не можешь объяснить построчно.**

Проверочный вопрос на каждую незнакомую аннотацию или зависимость:
**«что сломается, если это убрать?»** Если ответа нет — ты её не понял, а скопировал.
Именно этим сеньор отличается от джуна: не объёмом знаний, а привычкой не пропускать непонятное.

---

## 1. Что это за проект

Переписывание портала кафедры УИТС. Старый работающий портал на **Django 4.2 + Angular 14**
(`stankinUits/uits_portal`, проект из ВКР Маловой Я.И.) переносится на **Spring Boot 4 + React 19**
с полным паритетом функционала — ничего не выбрасывается.

### Целевая картинка — что должно получиться

**Публичная часть сайта:** новости и объявления, преподаватели с карточками, расписание занятий
и экзаменов, 13 редактируемых markdown-страниц, конференции, достижения, научные публикации,
аспирантура.

**Личный кабинет:** профиль, календарь событий с напоминаниями, привязка Telegram
(бот шлёт напоминания о событиях).

**Админка:** не отдельное приложение, а CRUD-экраны в том же React под ролями ADMIN/MODERATOR.
Это замена Django Admin, которого в новом стеке нет вообще — самый большой недооценённый кусок работы.

**Технически:** модульный монолит на Spring Boot (13 модулей) + один Python-микросервис,
который парсит PDF расписания. Один VPS, docker compose, CI в GitHub Actions.

### Где мы сейчас

Паритет **2 модуля из 23**. Готово: аутентификация (JWT), профиль, смена пароля.
Частично: новости (только список + создание), преподаватели (только список).
Фронтенд — мёртвый скаффолд, не рендерит ничего (см. §9).
Продовый стенд на VPS **мёртв** (проверено 2026-07-21) — реальных пользователей и данных нет.

---

## 2. Карта репозитория

```
uits-stankin/
├── backend/        Spring Boot, Java 21, Gradle (Kotlin DSL) — 31 java-файл, всё живое
├── frontend/       React 19 + Vite + Tailwind 4 — мёртвый скаффолд, см. §9
├── docs/           этот файл + ARCHITECTURE / MIGRATION / IMPLEMENTATION / BACKLOG
└── .github/workflows/deploy.yml   CI: тесты → сборка → деплой по SSH на VPS
```

Backend внутри:

```
backend/src/main/java/ru/stankin/uits/
├── UitsPortalApplication.java      точка входа (main)
├── security/                       вся Spring Security, 5 файлов — cross-cutting
└── module/                         бизнес-модули, каждый по одной схеме
    ├── auth/     только контроллер логина
    ├── user/     профиль + смена пароля
    ├── news/     новости
    └── staff/    преподаватели
```

### Почему пакеты нарезаны по фичам, а не по слоям

Это осознанное решение, зафиксированное в [ARCHITECTURE.md §4.1](ARCHITECTURE.md). Все туториалы
по Spring показывают нарезку по слоям (`controller/`, `service/`, `entity/`), поэтому она кажется
«правильной». На 3 сущностях разницы нет, на 13 модулях — есть.

**Ключевая мысль: слой ≠ пакет.**

* **Слой** — правило о **направлении зависимостей**: Controller → Service → Repository, и никогда наоборот.
* **Пакет** — правило о том, **что лежит рядом** и что удаляется одним куском.

Это независимые оси. Разложив файлы по фичам, ты не отказываешься от слоёв — они внутри каждого модуля.

Четыре аргумента за нарезку по фичам:

1. **Инкапсуляция.** При нарезке по слоям `NewsService` *обязан* быть `public` — он в другом пакете,
   чем контроллер. Значит и репозиторий public, и маппер public: любой класс проекта может дёрнуть
   любой репозиторий в обход сервиса. При нарезке по фичам можно сделать репозиторий и маппер
   package-private, оставив наружу только сервис. У модуля появляется настоящий публичный API.
2. **Масштаб.** 13 модулей по слоям = `entity/` на 40 файлов. Структура должна кричать
   «портал кафедры: новости, расписание, преподаватели», а не «это Spring MVC».
3. **Локальность изменений.** Новый модуль = одна новая папка, существующие файлы не тронуты.
   По слоям — правки в шести папках и конфликты слияния с напарником.
4. **Удаляемость.** Фича выпилена = папка удалена. И если модуль когда-то придётся отрезать
   в отдельный сервис — это единственная структура, из которой это режется по живому.

Папки соблюдение слоёв **не гарантируют**: ничто не мешает контроллеру дёрнуть репозиторий напрямую.
Гарантирует это ArchUnit — тесты вида «controller не имеет права зависеть от repository». См. BACKLOG T-10.

### Схема одного модуля

Внутри каждого модуля одинаковые 6 папок:

| Папка | Что это |
|---|---|
| `entity` | Java-класс = строка в таблице БД |
| `repository` | интерфейс доступа к БД, реализацию генерит Spring |
| `service` | бизнес-логика |
| `controller` | HTTP-эндпоинты |
| `dto` | что летит по HTTP — **отдельно от entity** |
| `mapper` | entity ↔ dto, код генерит MapStruct |

**Зачем DTO отдельно от Entity.** Чтобы наружу не уехало лишнее. `User` содержит `password`,
а `UserResponseDto` — нет. Маппер гарантирует, что поле физически не может просочиться в JSON.

---

## 3. Как запустить

```powershell
cd backend
docker compose up -d          # PostgreSQL на порту 5433
./gradlew bootRun
```

Swagger UI после старта: `http://localhost:8080/swagger-ui.html`

### Три грабли, на которые ты наступишь

**1. Падение на старте: `Could not resolve placeholder 'JWT_SECRET_KEY'`.**
`application.yaml` читает `${JWT_SECRET_KEY}` из **переменных окружения**, а Spring Boot файл `.env`
сам по себе **не читает** — это умеет docker compose, но не Java. Нужно задать переменную
в run-конфигурации IntelliJ либо в PowerShell перед запуском:

```powershell
$env:JWT_SECRET_KEY = "<значение из backend/.env>"
```

**2. Расхождение кредов к БД.** `application.yaml` коннектится как `postgres` / `password`,
а `docker-compose.yml` создаёт контейнер с юзером `uits_stankin_db` из `.env`. Если том
`uits_postgres_data` остался с прошлых запусков — прокатит; на чистой машине — нет
(образ postgres при заданном `POSTGRES_USER` роль `postgres` не создаёт вовсе).

**3. Нет эндпоинта регистрации.** В `AuthController` только `/login`, и регистрации
**не будет** — по [ARCHITECTURE.md §4.5](ARCHITECTURE.md) аккаунты создаёт админ. Первого
пользователя придётся вставить в БД руками с BCrypt-хешем.

Для `./gradlew test` нужен **запущенный Docker Desktop** — тесты поднимают настоящий PostgreSQL (§8).

---

## 4. Три понятия, которые надо развести

Аналогия — проходная в здании:

| | Вопрос | На проходной | В твоём коде |
|---|---|---|---|
| **Идентификация** | «Кто ты?» | Назвал фамилию | `username` в запросе; `subject` в JWT; `loadUserByUsername()` |
| **Аутентификация** | «Докажи» | Показал паспорт | `passwordEncoder.matches()`; проверка подписи `verifyWith(key)` |
| **Авторизация** | «Что тебе можно?» | Охранник смотрит, пускать ли на 5 этаж | `hasAnyRole('ADMIN','MODERATOR')`; `anyRequest().authenticated()` |

Идентификация — это **заявка** («я Иван»), она ничем не подкреплена и сама по себе ничего не стоит.
Аутентификация — **проверка доказательства** этой заявки. Авторизация — вообще про другое:
она про уже опознанного, и она про **права**, а не про личность.

Зачем это знать практически: в Spring Security эти три вещи разнесены по разным местам цепочки:

```
JwtAuthenticationFilter   → идентификация + аутентификация → кладёт Authentication в контекст
        ...
AuthorizationFilter       → авторизация → читает Authentication и решает, пускать ли
```

Именно поэтому JWT-фильтр при плохом токене **ничего не запрещает**, а просто пропускает запрос
дальше — запрещать не его работа, он только опознаёт. Запрещает другой фильтр, в конце цепочки.
Одна эта мысль объясняет весь дизайн.

(Четвёртая буква из связки AAA — **аудит**: кто что сделал. Его нет нигде, для админки понадобится.)

---

## 5. Путь одного HTTP-запроса

`POST /api/news` проходит через всё:

```
Браузер
  │  POST /api/news + заголовок "Authorization: Bearer eyJhbG..."
  ▼
┌──────────────────────────────────────────────────┐
│ ЦЕПОЧКА ФИЛЬТРОВ Spring Security  (§6)           │
│  … → JwtAuthenticationFilter → … → Authorization │
│      (кто ты?)                     (можно тебе?) │
└──────────────────────────────────────────────────┘
  ▼
NewsController.createNews()
  ├─ @PreAuthorize("hasAnyRole('ADMIN','MODERATOR')")  ← проверка роли
  ├─ @Valid @RequestBody NewsRequestDto  ← JSON → объект + валидация (@NotBlank, @Size)
  ▼
NewsService.createNews()
  ├─ getCurrentUser()  ← достаёт юзера из SecurityContextHolder
  ├─ newsMapper.toEntity(dto)  ← DTO → Entity
  ▼
NewsRepository.save(entity)
  ▼
Hibernate генерит INSERT INTO news_post ...
  ▼
PostgreSQL
```

---

## 6. Spring Security с нуля

### 6.1. Что такое фильтр — здесь нет магии

До Spring, в голой Java EE, есть **сервлет-фильтр**: объект, который перехватывает HTTP-запрос
**до** того, как его увидит твой код, что-то делает и решает — пропустить дальше или оборвать.

```java
void doFilter(request, response, chain) {
    // ...что-то до...
    chain.doFilter(request, response);  // ← "пропустить дальше по цепочке"
    // ...что-то после...
}
```

Не вызвал `chain.doFilter(...)` — запрос умер здесь, до контроллера не дойдёт.

**Spring Security — это ровно одна вещь: длинная цепочка таких фильтров, воткнутая перед всеми
контроллерами.** Всё остальное — обвес вокруг этой идеи. Больше никакой магии нет.

Порядок фильтров (упрощённо, наш помечен):

```
CorsFilter                      → разрешить кросс-доменные запросы
CsrfFilter                      → отключен у нас (.csrf(disable))
JwtAuthenticationFilter    ★НАШ → достать токен, опознать юзера
UsernamePasswordAuthFilter      → форма логина (не нужна, но мы к ней привязываемся по порядку)
ExceptionTranslationFilter      → ловит ошибки доступа → 401/403
AuthorizationFilter             → проверяет правила из authorizeHttpRequests()
──────────────────────────────
DispatcherServlet → твой @RestController
```

### 6.2. Пять понятий

| Понятие | Человеческим языком | Где у нас |
|---|---|---|
| **`Authentication`** | «пропуск» текущего запроса: кто ты + роли + аутентифицирован ли | создаётся в фильтре, строки 51–58 |
| **`Principal`** | собственно «кто ты» — объект пользователя внутри пропуска | наш `SecurityUser` |
| **`GrantedAuthority`** | одна строка-право, напр. `"ROLE_ADMIN"` | `SecurityUser.getAuthorities()` |
| **`SecurityContextHolder`** | глобальная переменная (`ThreadLocal`) с `Authentication` — доступна из любой точки кода в рамках запроса | `SecurityContextHolder.getContext().getAuthentication()` |
| **`UserDetails`** | интерфейс, который Security требует от «пользователя»: `getUsername()`, `getPassword()`, `getAuthorities()`, `isEnabled()` | `SecurityUser implements UserDetails` |

**Почему `SecurityUser`, а не сам `User`?** `User` — JPA-сущность, отображение таблицы. Заставлять её
реализовывать интерфейс фреймворка безопасности — смешивать слои. Поэтому `SecurityUser` — обёртка:
внутри настоящий `User`, наружу торчит то, что хочет Spring Security. Там же происходит перевод
булевых флагов из Django-схемы в роли:

```java
if (user.isSuperuser())  authorities.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
if (user.isModerator())  authorities.add(new SimpleGrantedAuthority("ROLE_MODERATOR"));
if (user.isTeacher())    authorities.add(new SimpleGrantedAuthority("ROLE_TEACHER"));
authorities.add(new SimpleGrantedAuthority("ROLE_USER"));  // всем
```

> **Про префикс `ROLE_`.** Тупая, но важная конвенция. `hasRole('ADMIN')` внутри дописывает `ROLE_`
> и ищет authority `ROLE_ADMIN`. А `hasAuthority('ADMIN')` ищет ровно `ADMIN`. Правило:
> **в коде/БД хранишь `ROLE_ADMIN`, в аннотациях пишешь `hasRole('ADMIN')`.** У нас так и сделано.

### 6.3. Сценарий А: логин (пароль → токен)

```
POST /api/users/auth/login   {"username":"ivan","password":"secret"}
  │  путь разрешён всем: .requestMatchers("/api/users/auth/**").permitAll()
  ▼
AuthController.login()
  │
  ├─(1) authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(user, pass))
  │       ▼  делегирует в DaoAuthenticationProvider
  │       ├─ CustomUserDetailsService.loadUserByUsername("ivan")
  │       │     └─ userRepository.findByUsername → SecurityUser(user)
  │       │        нет юзера → UsernameNotFoundException
  │       ├─ passwordEncoder.matches("secret", "$2a$10$хеш_из_БД")
  │       │     └─ BCrypt хеширует введённый пароль той же солью и сравнивает
  │       │        не совпало → BadCredentialsException
  │       └─ проверяет isEnabled() / isAccountNonLocked() и т.д.
  │
  ├─(2) userDetailsService.loadUserByUsername(...)   ← ВТОРОЙ поход в БД, дефект D-04
  │
  └─(3) jwtService.generateToken(user)
          Jwts.builder()
            .subject("ivan")               ← кто
            .issuedAt(сейчас)
            .expiration(сейчас + 24 часа)
            .signWith(секретный_ключ)      ← ПОДПИСЬ, HMAC-SHA256
            .compact()
  ▼
{"access_token": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJpdmFuIiwi....подпись"}
```

**Что такое JWT физически.** Три части через точку, Base64:

```
header.payload.signature
{"alg":"HS256"} . {"sub":"ivan","iat":...,"exp":...} . HMAC_SHA256(header.payload, SECRET)
```

Payload **не зашифрован** — кто угодно его прочитает (вставь токен на jwt.io и увидишь).
Смысл не в секретности, а в **неподделываемости**: подпись можно проверить, только зная `SECRET`.
Поменяешь `"sub":"ivan"` на `"sub":"admin"` — подпись перестанет сходиться, сервер отвергнет.

Отсюда правило: **никогда не клади в JWT ничего секретного.**

### 6.4. Сценарий Б: обычный запрос (токен → доступ)

```
GET /api/users/profile   Authorization: Bearer eyJhbG...
  ▼
JwtAuthenticationFilter.doFilterInternal()
  │
  ├─ нет заголовка / не начинается с "Bearer "?
  │     → просто пропускаем дальше БЕЗ аутентификации
  │       (фильтр НЕ отвергает запрос сам — он либо опознаёт, либо молчит)
  │
  ├─ jwt = заголовок.substring(7)                   ← отрезаем "Bearer "
  ├─ username = jwtService.extractUsername(jwt)     ← здесь же проверяется подпись
  │     парсер .verifyWith(ключ) кинет исключение, если подпись левая  ← дефект D-01
  │
  ├─ userDetails = userDetailsService.loadUserByUsername(username)   ← поход в БД
  ├─ jwtService.isTokenValid(...)                   ← имя совпало И не истёк
  │
  └─ SecurityContextHolder.getContext().setAuthentication(authToken)
        ↑ ВОТ ЭТО и есть «пользователь залогинен» для остального кода
  ▼
AuthorizationFilter: правило .anyRequest().authenticated()
  ├─ в SecurityContext пусто? → ExceptionTranslationFilter → 403, контроллер не вызван
  └─ есть? → пропускаем
  ▼
UserController.getMyProfile(@AuthenticationPrincipal SecurityUser securityUser)
       ↑ аннотация просто достаёт principal из SecurityContextHolder
```

Три способа получить текущего юзера, все встречаются в проекте:

```java
// 1. Красиво — параметр метода контроллера (UserController)
@GetMapping("/profile")
public ... getMyProfile(@AuthenticationPrincipal SecurityUser securityUser)

// 2. Руками из любого места (NewsService.getCurrentUser())
SecurityContextHolder.getContext().getAuthentication().getPrincipal()

// 3. Просто Principal в контроллере (в проекте не используется)
```

### 6.5. Разбор `SecurityConfig` построчно

```java
.csrf(disable)
```
CSRF-атака возможна, когда браузер **автоматически** прикладывает креды (cookie-сессию) к запросу
с чужого сайта. У нас токен кладётся в заголовок **вручную** из JavaScript — автоматически он никуда
не уедет, значит CSRF неприменим. Отключено корректно.
⚠️ Когда появится refresh-токен в httpOnly cookie — CSRF снова станет актуален для эндпоинта refresh.

```java
.cors(... setAllowedOriginPatterns("*") ...)
```
Браузер запрещает JS с `localhost:5173` дёргать `localhost:8080`, если сервер явно не разрешил.
Здесь разрешено всё. Для прода надо сузить до реальных доменов и добавить `setAllowCredentials(true)`,
когда появятся cookie. См. BACKLOG T-04.

```java
.authorizeHttpRequests(auth -> auth
    .requestMatchers("/api/users/auth/**").permitAll()   // логин
    .requestMatchers("/error").permitAll()
    .requestMatchers("/v3/api-docs/**", "/swagger-ui/**").permitAll()
    .requestMatchers("/api/public/**").permitAll()       // ← конвенция
    .anyRequest().authenticated()
)
```
Правила проверяются **сверху вниз, первое совпавшее выигрывает**. `anyRequest().authenticated()`
в конце = «всё остальное закрыто по умолчанию» — правильный дефолт.

Обрати внимание на конвенцию **`/api/public/**`**: вместо перечисления каждого открытого эндпоинта
публичные вещи просто живут под этим префиксом. Поэтому в контроллерах:

```java
@GetMapping("/public/news")   // открыто всем
@PostMapping("/news")         // требует логина + роли
```

```java
.sessionManagement(STATELESS)
```
«Не создавай HTTP-сессию, не выдавай `JSESSIONID`, не помни ничего между запросами». Каждый запрос
опознаётся с нуля по токену. Это и есть смысл JWT — сервер не хранит состояние сессий, можно
масштабировать горизонтально. Обратная сторона: **выданный токен нельзя отозвать**, он валиден
до истечения срока. Отсюда требование короткого TTL + refresh-токенов в БД (ARCHITECTURE §4.5).

```java
.addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
```
Втыкаем наш фильтр в цепочку на место, где обычно стоит обработчик формы логина.

```java
@EnableMethodSecurity
```
Включает `@PreAuthorize` на методах. **Без неё `@PreAuthorize` в `NewsController` молча ничего
бы не делал** — классическая дыра. Работает через AOP-прокси: Spring подменяет бин прокси-объектом,
который перед вызовом метода вычисляет SpEL-выражение.

**Две независимые линии обороны:** по URL в `SecurityConfig` (грубая) и по методу через
`@PreAuthorize` (точная).

```java
new BCryptPasswordEncoder()
```
BCrypt — намеренно медленный хеш с солью внутри. Одинаковые пароли дают разные хеши. Проверка
только через `passwordEncoder.matches(raw, hash)`, сравнивать строки бессмысленно.

⚠️ Задача из миграции: в старой БД пароли в формате **Django pbkdf2**, а не BCrypt. По ARCHITECTURE
решено сделать кастомный `PasswordEncoder`, понимающий формат Django, с перехешированием в BCrypt
при первом успешном логине. Пока этого нет — старые юзеры не залогинятся.

---

## 7. Разбор всех файлов бэкенда

### Корень и security (6 файлов)

| Файл | Что делает |
|---|---|
| `UitsPortalApplication.java` | Точка входа. `@SpringBootApplication` = автоконфигурация + сканирование бинов в этом пакете и ниже. Убрать — приложение не соберёт контекст. |
| `security/SecurityConfig.java` | Вся конфигурация Security: цепочка фильтров, правила URL, провайдер аутентификации, `PasswordEncoder`. Разобран в §6.5. |
| `security/JwtService.java` | Генерация и разбор JWT. Секрет и TTL приходят из `application.yaml` через `@Value`. `getSignInKey()` декодирует Base64-секрет в `SecretKey` для HMAC-SHA256. |
| `security/JwtAuthenticationFilter.java` | `OncePerRequestFilter` — гарантия, что отработает ровно один раз за запрос (без него при forward/include мог бы сработать дважды). Логика в §6.4. |
| `security/SecurityUser.java` | Адаптер `User` (JPA) → `UserDetails` (Security). Здесь булевы флаги превращаются в роли. `isEnabled()` возвращает `user.isActive()` — забаненный юзер не войдёт. |
| `security/CustomUserDetailsService.java` | Единственная реализация `UserDetailsService`: достаёт `User` из БД по username и оборачивает в `SecurityUser`. Точка входа Security в твою БД. |

### module/auth (1 файл)

**`AuthController`** — `POST /api/users/auth/login`. Внутри `record LoginRequest/LoginResponse`
объявлены прямо в классе-контроллере (для одного эндпоинта нормально, при росте — вынести в `dto/`).
Поле ответа названо `access_token` в snake_case — совместимость со старым Angular-фронтом.

### module/user (7 файлов)

| Файл | Что делает |
|---|---|
| `entity/User.java` | Таблица `users_user` — **имя из Django**, чтобы данные переехали без переименований. Роли — булевы колонки (`is_superuser`, `is_moderator`, `is_teacher`), тоже наследие Django. `@PrePersist onCreate()` проставляет `dateJoined`, если не задан. `OffsetDateTime`, т.к. в Postgres колонка `timestamp with time zone`. |
| `repository/UserRepository.java` | `findByUsername` — Spring Data **генерит SQL из имени метода**. Убери метод — сломается логин. |
| `service/UserService.java` | `changePassword`: проверяет старый пароль через `matches()`, хеширует новый, сохраняет. Кидает `BadCredentialsException` — из-за отсутствия advice это превращается в голый 403 (дефект D-02). |
| `controller/UserController.java` | `GET /api/users/profile`, `POST /api/users/change-password`. Показательный пример `@AuthenticationPrincipal`. |
| `mapper/UserMapper.java` | Один метод `toDto`. Именно он не пускает `password` в JSON. |
| `dto/UserResponseDto.java` | Что отдаём наружу. Пароля здесь нет — и это не случайность. |
| `dto/ChangePasswordRequest.java` | `@NotBlank`, `@Size(min=6)` — работают только благодаря `@Valid` в контроллере. Убери `@Valid` — аннотации станут декорацией. |

### module/news (7 файлов)

| Файл | Что делает |
|---|---|
| `entity/NewsPost.java` | Таблица `news_post`. `@ManyToOne(fetch = LAZY)` на `author` = внешний ключ `author_id`, юзер подгружается при первом обращении к полю. `postType` — строка `"news"`/`"announcements"`; по-хорошему enum (задача паритета). |
| `repository/NewsRepository.java` | `findAllByDisplayTrueOrderByCreatedAtDesc()` — весь фильтр и сортировка закодированы в **имени метода**, SQL пишет Spring Data. |
| `service/NewsService.java` | `createNews` берёт автора из `SecurityContextHolder` через `getCurrentUser()` с развёрнутыми проверками. |
| `controller/NewsController.java` | `GET /api/public/news` (всем) и `POST /api/news` под `@PreAuthorize("hasAnyRole('ADMIN','MODERATOR')")`. |
| `mapper/NewsMapper.java` | `toDto` склеивает `authorName` через `expression = "java(...)"`. ⚠️ Упадёт с NPE, если у автора `firstName == null`. `toEntity` явно игнорирует `id`, `createdAt`, `author` — их нельзя задать снаружи. |
| `dto/NewsRequestDto.java` | ⚠️ `@Size(max = 225)` на `shortDescription` — вероятная опечатка, в БД колонка `TEXT`, а в старой схеме было 255. |
| `dto/NewsResponseDto.java` | Наружу отдаётся `authorName` строкой, а не вложенный объект юзера. |

### module/staff (6 файлов)

| Файл | Что делает |
|---|---|
| `entity/Teacher.java` | Таблица `employee_teacher`, `@OneToOne` на `User`. Модель **беднее оригинала**: нет отчества, предметов, enum-званий, расписания экзаменов (см. MIGRATION). |
| `repository/TeacherRepository.java` | **Самое интересное место в проекте с точки зрения производительности.** `findAll()` переопределён с `@EntityGraph(attributePaths = {"user"})`. Без него: 1 запрос за преподавателями + по одному за каждым юзером = **проблема N+1**. С `@EntityGraph` Hibernate делает один JOIN. Изучи этот приём — он понадобится в каждом списочном эндпоинте. |
| `service/TeacherService.java` | Просто `findAll()` → маппер. |
| `controller/TeacherController.java` | Только `GET /api/public/teachers`. CRUD нет — модуль частичный. |
| `mapper/TeacherMapper.java` | Разворачивает поля вложенного `user` в плоский DTO через `@Mapping(source = "user.firstName", ...)`. |
| `dto/TeacherResponseDto.java` | Плоская структура: поля юзера + поля преподавателя. |

### Ресурсы

| Файл | Что делает |
|---|---|
| `application.yaml` | Настройки. Ключевое — `ddl-auto: validate` (§8). Закомментирован `logging.level.org.springframework.security: DEBUG` — **раскомментируй, когда разбираешься с Security**, он печатает всю цепочку фильтров. |
| `db/changelog/db.changelog-master.yaml` | Оглавление: подключает три changeset-файла по порядку. |
| `changesets/001-create-users-table.yml` | Таблица `users_user`. |
| `changesets/002-create-news-table.yml` | Таблица `news_post` + FK `fk_news_author` на `users_user(id)`. |
| `changesets/003-create-teacher-table.yml` | Таблица `employee_teacher` + FK `fk_teacher_user`, `user_id` уникален (это и есть OneToOne на уровне БД). |

⚠️ Ни в одном changeset **нет индексов и нет `rollback`-блоков** — обязательное требование
ARCHITECTURE §8. Например, `findAllByDisplayTrueOrderByCreatedAtDesc` без индекса
на `(display, created_at)` будет читать всю таблицу.

### Тесты (4 файла)

| Файл | Что делает |
|---|---|
| `AbstractIntegrationTest.java` | База для всех тестов. Поднимает **настоящий PostgreSQL в Docker** (Testcontainers), `@DynamicPropertySource` подсовывает Spring его координаты и тестовый JWT-секрет. `@BeforeEach` делает `TRUNCATE ... RESTART IDENTITY CASCADE` — изоляция тестов друг от друга. |
| `AuthIntegrationTest.java` | Логин с верным паролем → токен не пустой; с неверным → 4xx. Название теста говорит «403» — и это правда, но по-хорошему должен быть **401** (дефект D-02). `userRepository.deleteAll()` внутри тестов лишний — `TRUNCATE` уже отработал. |
| `NewsIntegrationTest.java` | Лучший тест в проекте: админ создаёт новость → 200 и запись в БД с правильным автором; обычный юзер → **403 и в БД пусто**; публичный список отдаёт только `display=true`. Ровно так проверяется авторизация. |
| `UserIntegrationTest.java` | Профиль по валидному токену; без токена → 4xx. ⚠️ Пароль сохраняется **сырым**, без хеширования, и токен генерится напрямую через `jwtService` — тест намеренно **обходит логин** и проверяет только фильтр. |

---

## 8. «Магия» фреймворков

**Lombok.** Генерация boilerplate при компиляции. Важнейшая аннотация —
**`@RequiredArgsConstructor`**: генерит конструктор из всех `final` полей, а Spring, видя
единственный конструктор, внедряет в него зависимости. Поэтому сервисы выглядят так:

```java
@Service
@RequiredArgsConstructor
public class NewsService {
    private final NewsRepository newsRepository;   // ← Spring подставит сам
    private final NewsMapper newsMapper;
}
```

**JPA / Hibernate.** `@Entity` + `@Table(name="news_post")` — класс ↔ таблица.
`fetch = LAZY` — связанный объект грузится не сразу, а при первом обращении к полю.
Отсюда растут N+1 и `LazyInitializationException` — две главные боли JPA.

**Liquibase — кто хозяин схемы.** В `application.yaml` стоит `ddl-auto: validate`: Hibernate
**не создаёт и не меняет таблицы**, только сверяет их с сущностями при старте и падает при
расхождении. Схему создаёт Liquibase. Практически: **добавил поле в Entity → обязан добавить
changeset**, иначе приложение не стартует. Liquibase помнит применённое в служебной таблице
`databasechangelog`. Правило: применённый changeset **не редактируют** — добавляют новый.

**MapStruct.** Интерфейс с `@Mapper(componentModel="spring")` — реализацию (`NewsMapperImpl`)
генерит annotation processor при компиляции в `build/generated/`. Если IDE ругается
«не найден бин NewsMapper» — просто пересобери проект.

**Testcontainers.** Не H2 и не моки — настоящая БД в контейнере на время тестов. Поэтому тесты
ловят реальные ошибки схемы, FK и SQL-диалекта, но требуют запущенного Docker.

---

## 9. Фронтенд — честная картина

Он **не работает и не может работать**. Не «недоделан», а буквально не рендерит ничего:

* `App.tsx` — внутри `QueryClientProvider` лежит только `<ReactQueryDevtools />`.
  **`RouterProvider` не подключён вообще**, хотя роутер собран в `routes/index.tsx`. Белый экран by design.
* В `routes/index.tsx` все реальные роуты закомментированы, папки `features/` не существует.
* `QueryClient` создаётся **дважды** — в `main.tsx` и в `App.tsx`, провайдеры вложены друг в друга.
* `services/auth/auth.ts` — только заглушка анонимного профиля, HTTP-клиента к бэкенду нет.
* Опечатка в имени папки: `layouts/AppLAayout/`.
* Tailwind v4 тема не подключена через `@config`.

Последний коммит по фронту — март 2026. **Фронт — критический путь проекта**: пока его нет,
каждый новый модуль бэкенда пишется вслепую. Это зона напарника-фронтендера, но давить на неё
нужно как на приоритет №1 после Фазы 0.

---

## 10. Известные дефекты бэкенда

| ID | Дефект | Последствие |
|---|---|---|
| **D-01** | В `JwtAuthenticationFilter` вызов `extractUsername(jwt)` **без `try/catch`**. jjwt кидает `ExpiredJwtException` / `MalformedJwtException`, это не `AuthenticationException`, поэтому `ExceptionTranslationFilter` его не ловит. | Протухший токен → **HTTP 500** вместо 401. Токен живёт 24 часа, значит это словит каждый пользователь. |
| **D-02** | Нет ни одного `@RestControllerAdvice`. | Неверный пароль → голый **403 без тела**. Фронт не отличит «не тот пароль» от «нет прав». |
| **D-03** | Токен на 24 часа, refresh-токена нет, отзыва нет. | Смена пароля не инвалидирует старые токены. Противоречит ARCHITECTURE §4.5. |
| **D-04** | `AuthController` грузит юзера из БД дважды: `authenticate()` уже вернул `Authentication` с principal внутри. | Лишний запрос к БД на каждый логин. |
| **D-05** | `last_login` никогда не обновляется. | Колонка есть, писать в неё некому. |
| **D-06** | `@Transactional` не стоит нигде. | Пока операции однооперационные и прокатывает; `changePassword` и `createNews` уже читают+пишут. |
| **D-07** | Нет пагинации ни на одном списочном эндпоинте. | `/api/public/news` со временем начнёт отдавать всю таблицу. |
| **D-08** | Нет индексов и `rollback`-блоков в changeset'ах. | Полное сканирование таблиц; откат миграции невозможен. |
| **D-09** | `NewsMapper.authorName` падает с NPE, если у автора пустое имя. | 500 на публичном эндпоинте. |
| **D-10** | Расхождение кредов `application.yaml` ↔ `.env` ↔ `docker-compose.yml`. | Проект не стартует на чистой машине. |

Все они разложены на тикеты в [BACKLOG.md](BACKLOG.md).

---

## 11. Как проверять, что ты действительно понял

Пройдись по списку. Если на вопрос нет ответа — возвращайся к соответствующему разделу.

1. Что произойдёт, если убрать `@EnableMethodSecurity` из `SecurityConfig`?
2. Почему JWT-фильтр не возвращает 401 сам, хотя видит невалидный токен?
3. Где физически хранится «пользователь залогинен» между фильтром и контроллером?
4. Почему `SecurityUser` — отдельный класс, а не интерфейс на `User`?
5. Что вернёт `hasRole('ROLE_ADMIN')` для админа — и почему это ловушка?
6. Зачем `ddl-auto: validate`, если есть `update`?
7. Что сделает Hibernate при `findAll()` в `TeacherRepository`, если убрать `@EntityGraph`?
8. Почему `@Valid` обязателен, хотя аннотации стоят на полях DTO?
9. Почему в JWT нельзя класть пароль, если он подписан?
10. Что сломается, если у `NewsPost.author` поменять `LAZY` на `EAGER`?
