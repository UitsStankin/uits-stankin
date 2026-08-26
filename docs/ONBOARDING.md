# Онбординг: как устроен этот проект

> Документ для того, чтобы **понять собственный код** — каждый файл и каждую строку.
> Написан 2026-07-21 после четырёхмесячного перерыва. Читается сверху вниз за один заход.
>
> ⚠️ Разбор §5–§6 — снимок кода **до Фазы 0**: обработки JWT-ошибок в фильтре и CORS
> по белому списку в нём нет.
> §7 сверен с кодом 2026-08-26 и покрывает 41 файл из 50, включая модули Фазы 1 —
> `common/storage` (T-22) и `module/pages` (T-25); что осталось за рамками,
> перечислено в его шапке. Актуальные статусы дефектов — в таблице §10.
>
> Связанные документы: [ARCHITECTURE.md](ARCHITECTURE.md) — принятые решения и почему;
> [MIGRATION.md](MIGRATION.md) — матрица паритета со старым порталом;
> [IMPLEMENTATION.md](IMPLEMENTATION.md) — как делать конкретные сложные куски;
> [BACKLOG.md](BACKLOG.md) — что делать прямо сейчас, разложенное на тикеты.

---

## 0. Как пользоваться этим документом

Главное правило проекта: **не мержим то, что нельзя объяснить построчно.**

Проверочный вопрос на каждую незнакомую аннотацию или зависимость:
**«что сломается, если это убрать?»** Если ответа нет — значит, она не понята, а скопирована.
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

Паритет **4 модуля из 23**. Готово: аутентификация (JWT), профиль и смена пароля,
роли (права проверены по всем ручкам), новости (CRUD, санитизация rich-text, превью-картинка).
Частично: загрузка файлов (upload с ресайзом есть, аватар сохранять некуда),
преподаватели (только список).
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

Это независимые оси. Раскладка по фичам не отменяет слои — они внутри каждого модуля.

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

### Три грабли на старте

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

| | Вопрос | На проходной | В коде проекта |
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
**до** того, как его увидит код приложения, что-то делает и решает — пропустить дальше или оборвать.

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
DispatcherServlet → наш @RestController
```

### 6.2. Пять понятий

| Понятие | Человеческим языком | Где у нас |
|---|---|---|
| **`Authentication`** | «пропуск» текущего запроса: кто пришёл + роли + аутентифицирован ли | создаётся в фильтре, строки 51–58 |
| **`Principal`** | собственно «кто пришёл» — объект пользователя внутри пропуска | наш `SecurityUser` |
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
> **в коде и БД хранится `ROLE_ADMIN`, в аннотациях пишется `hasRole('ADMIN')`.** У нас так и сделано.

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

Payload **не зашифрован** — кто угодно его прочитает: достаточно вставить токен на jwt.io.
Смысл не в секретности, а в **неподделываемости**: подпись можно проверить, только зная `SECRET`.
Если поменять `"sub":"ivan"` на `"sub":"admin"` — подпись перестанет сходиться, сервер отвергнет.

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

Здесь работает конвенция **`/api/public/**`**: вместо перечисления каждого открытого эндпоинта
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

## 7. Разбор файлов бэкенда по модулям

> Разобран 41 файл из 50 в `src/main/java` и 4 тестовых класса из 16. Число в заголовке
> раздела — сколько файлов в нём описано; где описано не всё, стоит «X из Y».
> Вне разбора остались: `common/PageResponseDto`, четыре класса `common/exception`,
> `config/DevDataSeeder`, `config/OpenApiConfig`, `security/JwtAuthenticationEntryPoint`,
> `security/RestAccessDeniedHandler` и все тесты, кроме четырёх ниже.

### Корень и security (6 из 8 файлов)

| Файл | Что делает |
|---|---|
| `UitsPortalApplication.java` | Точка входа. `@SpringBootApplication` = автоконфигурация + сканирование бинов в этом пакете и ниже. Убрать — приложение не соберёт контекст. |
| `security/SecurityConfig.java` | Вся конфигурация Security: цепочка фильтров, правила URL, провайдер аутентификации, `PasswordEncoder`. Разобран в §6.5. |
| `security/JwtService.java` | Генерация и разбор JWT. Секрет и TTL приходят из `application.yaml` через `@Value`. `getSignInKey()` декодирует Base64-секрет в `SecretKey` для HMAC-SHA256. |
| `security/JwtAuthenticationFilter.java` | `OncePerRequestFilter` — гарантия, что отработает ровно один раз за запрос (без него при forward/include мог бы сработать дважды). Логика в §6.4. |
| `security/SecurityUser.java` | Адаптер `User` (JPA) → `UserDetails` (Security). Здесь булевы флаги превращаются в роли. `isEnabled()` возвращает `user.isActive()` — забаненный юзер не войдёт. |
| `security/CustomUserDetailsService.java` | Единственная реализация `UserDetailsService`: достаёт `User` из БД по username и оборачивает в `SecurityUser`. Точка входа Security в БД проекта. |

### common/storage (7 файлов)

Загрузка и раздача картинок, T-22. Контракт ручек — [API.md](API.md), решение «диск сейчас,
S3 потом» — [ARCHITECTURE.md §3](ARCHITECTURE.md).

| Файл | Что делает |
|---|---|
| `FileStorage.java` | Интерфейс хранилища: `store` / `delete` / `url` / `exists`. Реализация одна, абстракция введена заранее — MinIO отложен, но переезд на него не закрыт. Ключевое решение: в БД лежит **ключ** (`news/2026/08/a3f9.jpg`), а не URL и не абсолютный путь. Путь зависит от машины, URL — от домена; сохранить в базу любой из них значит получить битые ссылки после первого же переезда. |
| `LocalFileStorage.java` | Единственная реализация — файлы на диске. Корень и публичный префикс приходят из `application.storage.root` и `application.storage.public-base-url` через `@Value`: локально это `./media`, в проде — том `media_data`, смонтированный в `/app/media` (`docker-compose.prod.yml`). Каталог создаётся в конструкторе, и неудача роняет приложение — иначе сервис поднялся бы «здоровым» и падал на каждой загрузке. Имя файла — `UUID` плюс раскладка `категория/yyyy/MM`, потому что имя из запроса — недоверенные данные. `resolveAndVerify` нормализует ключ и проверяет `startsWith(root)`. При `store` ключ собирает само хранилище, но `delete` получает его снаружи — из БД или из чужого кода, — и без проверки ключ вида `../../application.yaml` увёл бы удаление за пределы каталога. `delete` использует `deleteIfExists` — повторное удаление не ошибка, цель вызова уже достигнута. |
| `ImageProcessor.java` | Проверка и нормализация картинки: не больше 15 МБ, не больше 1600×1600, только JPEG и PNG. Формат определяется **по содержимому** (`ImageIO.getImageReaders`), а не по расширению и не по `Content-Type` — и то и другое присылает клиент, и подделать их ничего не стоит. Thumbnailator декодирует картинку и кодирует заново, поэтому всё, что прицеплено к файлу помимо изображения (EXIF, дописанный в хвост архив), до диска не доезжает. Ошибки — `InvalidFileException`, её `@ExceptionHandler` в `GlobalExceptionHandler` превращает в `400` с ProblemDetail. |
| `ProcessedImage.java` | Record из двух полей — байты и расширение. Нужен, чтобы `process()` вернул и то и другое разом: расширение выбирает процессор по распознанному формату, а имя файла из него собирает хранилище. |
| `FileController.java` | `POST /api/files`, `multipart/form-data`, под `@PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")` — аноним картинки не заливает. Категория берётся из белого списка `news` / `avatars` / `publications`: она попадает в путь на диске, и произвольной строке снаружи там делать нечего. Порядок шагов принципиален: сначала `ImageProcessor` (валидация и перекодирование), только потом `FileStorage.store` — на диск уезжает уже проверенный файл. Ответ — `201` с `key` и `url`. |
| `FileUploadResponseDto.java` | Ответ загрузки: `key` — чтобы сохранить в сущность, `url` — чтобы показать превью сразу, не собирая адрес на фронте руками. |
| `MediaResourceConfig.java` | Обратная сторона загрузки — раздача. `WebMvcConfigurer` вешает `ResourceHandler` с `/media/**` на каталог хранилища, то есть отдаёт файлы мимо контроллеров, как статику. Парная строка — `.requestMatchers(HttpMethod.GET, mediaBaseUrl + "/**").permitAll()` в `SecurityConfig`: без неё картинка требовала бы токен, а `<img src>` его не отправляет. |

⚠️ Файл целиком читается в память (`in.readAllBytes()`) и там же перекодируется. При лимите
в 15 МБ и редких одиночных загрузках это приемлемо, но потоковой обработки здесь нет:
десяток параллельных загрузок — десяток буферов в heap. Сам лимит продублирован:
`spring.servlet.multipart.max-file-size` отбивает запрос ещё до контроллера,
проверка в `ImageProcessor` — вторая линия на случай вызова не из HTTP.

### module/auth (1 файл)

**`AuthController`** — `POST /api/users/auth/login`. `record LoginRequest/LoginResponse`
объявлены прямо в классе-контроллере (для одного эндпоинта нормально, при росте — вынести в `dto/`).
Пользователь берётся из результата `authenticate()`, а не читается из БД повторно: один SELECT
на логин вместо двух (D-04). Перед выдачей токена вызывается `updateLastLogin` — колонка
`last_login` перестала быть мёртвой (D-05). Поле ответа — `accessToken` в camelCase;
snake_case `access_token` из старого Angular-контракта больше не отдаётся.

### module/user (7 файлов)

| Файл | Что делает |
|---|---|
| `entity/User.java` | Таблица `users_user` — **имя из Django**, чтобы данные переехали без переименований. Роли — булевы колонки (`is_superuser`, `is_moderator`, `is_teacher`), тоже наследие Django. `@PrePersist onCreate()` проставляет `dateJoined`, если не задан. `OffsetDateTime`, т.к. в Postgres колонка `timestamp with time zone`. |
| `repository/UserRepository.java` | `findByUsername` — Spring Data **генерит SQL из имени метода**. Убрать метод — сломается логин. Второй метод, `updateLastLogin`, написан руками: `@Modifying` + `@Query` пишут одну колонку точечным UPDATE, не поднимая сущность в память. |
| `service/UserService.java` | `changePassword` перечитывает пользователя по id: `@AuthenticationPrincipal` отдаёт объект, собранный при разборе токена, и он не managed — правки на нём в БД не уедут. Дальше сверка старого пароля через `matches()` и `setPassword` без `save()` — работает dirty checking внутри `@Transactional`. Неверный старый пароль — `InvalidOldPasswordException`, advice отдаёт `400` с ProblemDetail. `updateLastLogin` вызывается из `AuthController` при успешном логине. |
| `controller/UserController.java` | `GET /api/users/profile`, `POST /api/users/change-password`. Показательный пример `@AuthenticationPrincipal`. |
| `mapper/UserMapper.java` | Один метод `toDto`. Именно он не пускает `password` в JSON. |
| `dto/UserResponseDto.java` | Что отдаём наружу. Пароля здесь нет — и это не случайность. |
| `dto/ChangePasswordRequest.java` | `@NotBlank` на оба поля и `@Size(min = 8)` на новый пароль — работают только благодаря `@Valid` в контроллере. Убрать `@Valid` — аннотации станут декорацией. Сообщения написаны по-русски, в отличие от `NewsRequestDto` и `EditablePageRequestDto`. |

### module/news (7 файлов)

| Файл | Что делает |
|---|---|
| `entity/NewsPost.java` | Таблица `news_post`. `@ManyToOne(fetch = LAZY)` на `author` = внешний ключ `author_id`, юзер подгружается при первом обращении к полю — списки поэтому читаются через `@EntityGraph` (см. репозиторий). `postType` — строка `"news"`/`"announcements"`; по-хорошему enum (задача паритета). `previewImage` хранит **ключ** файла из `common/storage`, а не URL. `display` по умолчанию `true`, `createdAt` проставляет `@PrePersist`. |
| `repository/NewsRepository.java` | `findAllByDisplayTrue(Pageable)` — фильтр закодирован в **имени метода**, сортировка и размер страницы приходят из `Pageable`, SQL пишет Spring Data. Все четыре метода помечены `@EntityGraph(attributePaths = {"author"})`, включая переопределённые `findAll` и `findById` из `JpaRepository`: без этого каждый список новостей давал бы N+1 запрос за авторами. |
| `service/NewsService.java` | Полный CRUD плюс три вещи, которых не видно снаружи. Автор берётся из `SecurityContextHolder` через `getCurrentUser()` с развёрнутыми проверками. `content` прогоняется через `Jsoup.clean` по белому списку `Safelist.relaxed()` — поле уходит в браузер как разметка, и без чистки модератор (или тот, кто угнал его учётку) положил бы туда скрипт (T-21). Ключ превью проверяется через `fileStorage.exists`, иначе в базу уедет ссылка на несуществующий файл (T-23). Старый файл удаляется **после коммита** через `TransactionSynchronization`: диск транзакцию не откатывает, и удаление до коммита при откате оставило бы в базе ключ уже несуществующего файла. |
| `controller/NewsController.java` | Семь ручек. Публичные — `GET /api/public/news` (постранично, `sort = createdAt DESC` по умолчанию) и `GET /api/public/news/{id}`, обе отдают только `display = true`. Остальные — список, чтение, `POST`, `PUT`, `DELETE` — под `@PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")` и видят скрытые новости. `POST` отвечает `201` с заголовком `Location` на созданную новость. |
| `mapper/NewsMapper.java` | Не интерфейс, а **абстрактный класс**: ему нужен `FileStorage`, чтобы собрать `previewImageUrl` из ключа. Инъекция в поле через `@Autowired` — единственная в проекте, и она вынужденная: MapStruct генерит наследника с конструктором без аргументов. `authorName` собирается `@Named`-методом с фильтрацией null и пустых строк (D-09), `toEntity` и `updateEntity` игнорируют `id`, `createdAt`, `author` — их нельзя задать снаружи. |
| `dto/NewsRequestDto.java` | `@Pattern(regexp = "news\|announcements")` на `postType` — единственная защита от произвольной строки в этом поле, enum'а по-прежнему нет. `display` объявлен `Boolean` с `@NotNull`, а не `boolean`: примитив молча получил бы `false` при отсутствии поля в запросе, а так клиент обязан решить явно. `@Size(max = 100)` на `previewImage` совпадает с длиной колонки под ключ. |
| `dto/NewsResponseDto.java` | Наружу отдаётся `authorName` строкой, а не вложенный объект юзера. Превью приезжает двумя полями: `previewImage` — ключ для последующего `PUT`, `previewImageUrl` — готовый адрес для `<img>`, собранный маппером. |

### module/staff (6 файлов)

| Файл | Что делает |
|---|---|
| `entity/Teacher.java` | Таблица `employee_teacher`, `@OneToOne` на `User`. Модель **беднее оригинала**: нет отчества, предметов, enum-званий, расписания экзаменов (см. MIGRATION). |
| `repository/TeacherRepository.java` | **Самое интересное место в проекте с точки зрения производительности.** `findAll(Pageable)` переопределён с `@EntityGraph(attributePaths = {"user"})`. Без него: 1 запрос за преподавателями + по одному за каждым юзером = **проблема N+1**. С `@EntityGraph` Hibernate делает один JOIN. Приём стоит изучить — он повторён в `NewsRepository` и понадобится в каждом списочном эндпоинте. |
| `service/TeacherService.java` | `findAll(Pageable)` → маппер → общая обёртка `PageResponseDto`. Своей логики нет. |
| `controller/TeacherController.java` | Только `GET /api/public/teachers`, постранично. Сортировка по умолчанию — `user.lastName`, `user.firstName`, `id`: список людей без явного порядка выглядел бы случайным, а `id` в конце делает его однозначным при полных тёзках. CRUD нет — модуль частичный. |
| `mapper/TeacherMapper.java` | Разворачивает поля вложенного `user` в плоский DTO через `@Mapping(source = "user.firstName", ...)`. |
| `dto/TeacherResponseDto.java` | Плоская структура: поля юзера + поля преподавателя. |

### module/pages (7 файлов)

Тринадцать текстовых разделов сайта, T-25: контакты, направления подготовки, нормативные
документы кафедры и университета, учебные планы, практики и защиты ВКР бакалавриата
и магистратуры, аспирантура и два блока главной страницы. Создания и удаления нет —
все тринадцать строк заведены сидом (changeset 008) с пустым текстом, наружу открыта
только правка содержимого. Контракт — [API.md](API.md).

| Файл | Что делает |
|---|---|
| `entity/EditablePage.java` | Таблица `editable_pages_editablepage` и колонка `page` — **имена из Django**, как и в остальных модулях. Поле при этом названо `slug`: внутри класса `EditablePage` имя `page` не значит ничего, а связь поля с колонкой держит `@Column(name = "page")`. `slug` и `createdAt` помечены `updatable = false` — Hibernate не включит их в `UPDATE`, поэтому правка текста не может увести раздел на чужой адрес или переписать дату создания. `@PrePersist` и `@PreUpdate` ведут `createdAt` и `updatedAt` силами приложения: триггеров в схеме нет. |
| `repository/EditablePageRepository.java` | `findBySlug` — единственный собственный метод, остальное даёт `JpaRepository`. `Optional` здесь честный, а не «на всякий случай»: уникальность слага держит БД (`uq_editable_page_page` в changeset 007), двух строк с одним адресом не будет. |
| `service/EditablePageService.java` | `getBySlug` кидает `NotFoundException` — advice превращает её в `404` с ProblemDetail. `getAll` отдаёт постраничный список в общей обёртке `PageResponseDto`. `update` — самое поучительное место модуля: **вызова `save()` в нём нет и он не нужен**. Сущность, прочитанная внутри `@Transactional`, остаётся managed, и на коммите Hibernate сам сравнивает её с исходным снимком и выпускает `UPDATE` (dirty checking). Убрать `@Transactional` — правка молча не сохранится, а ручка продолжит отвечать `200`: в `application.yaml` стоит `open-in-view: false`, поэтому вне транзакции сущность становится detached сразу после запроса в репозиторий. |
| `controller/EditablePageController.java` | `GET /api/public/pages/{slug}` открыт всем — под общее правило `/api/public/**` → `permitAll` в `SecurityConfig`. `GET /api/pages` и `PUT /api/pages/{slug}` закрыты `hasAnyRole('ADMIN', 'MODERATOR')`. `@PageableDefault(size = 20, sort = "id")` здесь важен сортировкой, а не размером: 20 — это и есть дефолт Spring, а вот сортировки по умолчанию нет вовсе, и порядок строк определял бы Postgres. |
| `mapper/EditablePageMapper.java` | Один `toDto`. Ни одной `@Mapping` — имена полей DTO совпадают с полями сущности, и MapStruct раскладывает всё сам. Поле `id` в DTO просто не объявлено, поэтому наружу не уезжает. |
| `dto/EditablePageRequestDto.java` | Принимаются ровно два поля — `title` и `text`. Слага в теле нет: он приходит в пути и в сущности неизменяем. `@NotBlank` и `@NotNull` работают только в паре с `@Valid` в контроллере, без неё это декорация. На `text` стоит `@NotNull`, а не `@NotBlank`: пустой текст допустим — именно с ним разделы и заводятся сидом. ⚠️ Сообщения об ошибках написаны по-английски и с опечаткой («Title cant be empty») — строка скопирована из `NewsRequestDto`. Сервис и хранилище при этом отвечают по-русски: на клиент прилетает смесь двух языков. |
| `dto/EditablePageResponseDto.java` | Слаг, заголовок, текст и обе даты. Адресация разделов идёт по слагу, поэтому `id` наружу не нужен. |

⚠️ `update` собирает ответ **до** коммита: `@PreUpdate` проставит `updatedAt` в момент flush,
поэтому в теле ответа возвращается прежняя дата, а в БД оказывается новая (дефект D-11).
`EditablePageIntegrationTest` этого не ловит — `updatedAt` в нём не проверяется.

### Ресурсы

| Файл | Что делает |
|---|---|
| `application.yaml` | Настройки. Ключевое — `ddl-auto: validate` (§8) и `open-in-view: false`: вне транзакции сущность становится detached сразу после запроса в репозиторий, ленивые поля за пределами сервиса молча не подгружаются. `profiles.default: dev` — локальный запуск получает `DevDataSeeder`, прод обязан явно задать `prod`. Здесь же лимиты `multipart` (15 МБ) и корень файлового хранилища. Закомментирован `logging.level.org.springframework.security: DEBUG` — **его стоит включать при разборе проблем с Security**, он печатает всю цепочку фильтров. |
| `db/changelog/db.changelog-master.yaml` | Оглавление: подключает восемь changeset-файлов по порядку. Liquibase идёт строго по этому списку и запоминает выполненное в служебной таблице `databasechangelog` — уже применённый файл нельзя переименовать или поправить задним числом, изменение оформляется новым changeset-файлом. |
| `changesets/001-create-users-table.yml` | Таблица `users_user`. |
| `changesets/002-create-news-table.yml` | Таблица `news_post` + FK `fk_news_author` на `users_user(id)`. |
| `changesets/003-create-teacher-table.yml` | Таблица `employee_teacher` + FK `fk_teacher_user`, `user_id` уникален (это и есть OneToOne на уровне БД). |
| `changesets/004-widen-news-post-type.yml` | `post_type` расширен с `VARCHAR(12)` до `VARCHAR(20)`: строка `announcements` — 13 символов, и любая попытка создать анонс падала на уровне БД. |
| `changesets/005-add-news-index.yml` | Индекс `idx_news_display_created_at` под запрос главной: `WHERE display = true ORDER BY created_at DESC`. |
| `changesets/006-add-news-author-fk-index.yml` | Индекс `idx_news_author_id`. Postgres создаёт индекс под уникальные ограничения, но **не под внешние ключи** — без него JOIN за автором и удаление пользователя сканировали бы всю таблицу новостей. |
| `changesets/007-create-editable-page.yml` | Таблица `editable_pages_editablepage`; `page` уникален (`uq_editable_page_page`), `title` намеренно nullable — в строках, перенесённых со старого портала, он пуст. |
| `changesets/008-seed-editable-pages.yml` | Сид тринадцати разделов. Данные справочные, а не тестовые, поэтому едут changeset-файлом, а не `DevDataSeeder`: тот работает только в профиле dev, и на проде публичные ручки страниц отвечали бы `404`. |

⚠️ `rollback` прописан руками там, где Liquibase не выводит его сам: для `createTable`
и `createIndex` откат генерируется автоматически, а для `modifyDataType` (004)
и произвольного `sql` (008) — нет, и без явного блока шаг стал бы необратимым.

### Тесты (4 из 16 классов)

| Файл | Что делает |
|---|---|
| `AbstractIntegrationTest.java` | База для всех интеграционных тестов. Поднимает **настоящий PostgreSQL в Docker** (Testcontainers), `@DynamicPropertySource` подсовывает Spring его координаты, тестовый JWT-секрет и временный каталог хранилища. Каталог — одна константа на всю иерархию: путь входит в ключ кэша контекста Spring, и свой путь в каждом классе поднимал бы контекст заново. `@ActiveProfiles("test")` не даёт сработать `DevDataSeeder`. `@BeforeEach` делает `TRUNCATE news_post, employee_teacher, users_user RESTART IDENTITY CASCADE` — изоляция тестов друг от друга; `editable_pages_editablepage` в списке нет намеренно, её наполняет Liquibase-сид, и TRUNCATE снёс бы справочные данные на весь прогон. Хелперы `createUser` и `login` дают пользователя с нужными ролями и токен через настоящий `POST /login`. |
| `AuthIntegrationTest.java` | Четыре случая логина: верный пароль → `200` и непустой токен; неверный → `401` с ProblemDetail; пустые поля → `400` (это `@Valid` на `LoginRequest`, до аутентификации); заблокированный пользователь (`is_active = false`) → `401`. Последний проверяет, что `SecurityUser.isEnabled()` действительно читается Security. |
| `NewsIntegrationTest.java` | Самый большой тест проекта, около семисот строк. Матрица доступа: админ и модератор создают новость → запись в БД с правильным автором, обычный юзер → **403 и в БД пусто**, аноним → `401`. Контракт: `201` с заголовком `Location`, форма страницы, срез по `page` и `size`, `400` на неизвестное поле сортировки. Публичные ручки отдают только `display = true`, скрытая новость по id — `404`. Отдельный блок — санитизация: `<script>` и `onerror` вырезаются, форматирование и относительные картинки остаются. |
| `UserIntegrationTest.java` | Профиль по валидному токену и четыре случая смены пароля: успех, неверный старый → `400`, пустой новый → `400` со списком полей, слишком короткий → `400`. Токен собирается напрямую через `jwtService`, а не через `POST /login`: тест намеренно **обходит логин** и проверяет фильтр и сам эндпоинт. Пароль в базу кладётся хешем — `matches()` на сырой строке всегда даст false. |

Остальные 12 файлов `src/test` не разобраны: `ArchitectureTest`, `TestRole` (не тест,
а общий для тестов enum ролей), `EndpointAccessMatrixTest`, `CorsIntegrationTest`,
`JwtSecurityIntegrationTest`, `ProdProfileIntegrationTest`, тесты хранилища
(`LocalFileStorageTest`, `ImageProcessorTest`, `FileUploadIntegrationTest`),
`NewsPreviewImageIntegrationTest`, `TeacherIntegrationTest`, `EditablePageIntegrationTest`.

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

Статусы обновлены 2026-08-26: D-01…D-10 закрыты в T-01…T-12, D-11 найден при сверке §7 с кодом.

| ID | Дефект | Последствие | Статус |
|---|---|---|---|
| **D-01** | В `JwtAuthenticationFilter` вызов `extractUsername(jwt)` **без `try/catch`**. jjwt кидает `ExpiredJwtException` / `MalformedJwtException`, это не `AuthenticationException`, поэтому `ExceptionTranslationFilter` его не ловит. | Протухший токен → **HTTP 500** вместо 401. | ✅ исправлен (T-04): фильтр ловит `JwtException` и отдаёт 401 через `AuthenticationEntryPoint` |
| **D-02** | Нет ни одного `@RestControllerAdvice`. | Неверный пароль → голый **403 без тела**. | ✅ исправлен (T-03): `GlobalExceptionHandler` + `ProblemDetail` |
| **D-03** | Токен на 24 часа, refresh-токена нет, отзыва нет. | Смена пароля не инвалидирует старые токены. Противоречит ARCHITECTURE §4.5. | ⏳ открыт, по плану: refresh-токены — отдельный этап |
| **D-04** | `AuthController` грузит юзера из БД дважды: `authenticate()` уже вернул `Authentication` с principal внутри. | Лишний запрос к БД на каждый логин. | ✅ исправлен (T-12): principal берётся из результата `authenticate()`, один SELECT на логин |
| **D-05** | `last_login` никогда не обновляется. | Колонка есть, писать в неё некому. | ✅ исправлен (T-12): точечный `@Modifying`-UPDATE в транзакции при успешном логине |
| **D-06** | `@Transactional` не стоит нигде. | `changePassword` и `createNews` читают+пишут без транзакции. | ✅ исправлен (T-05) |
| **D-07** | Нет пагинации ни на одном списочном эндпоинте. | `/api/public/news` со временем начнёт отдавать всю таблицу. | ✅ исправлен (T-06): `Pageable` + `PageResponseDto` |
| **D-08** | Нет индексов и `rollback`-блоков в changeset'ах. | Полное сканирование таблиц; откат миграции невозможен. | ✅ исправлен (T-07): индекс под запрос новостей; явный rollback там, где Liquibase не генерирует его сам (004) |
| **D-09** | `NewsMapper.authorName` собирается без null-защиты. Уточнение: реальный симптом — строка «null Иванов» при пустом `firstName`; NPE только если `author` вовсе отсутствует. | Мусор в поле `authorName` на публичном эндпоинте. | ✅ исправлен (T-12): default-метод с фильтрацией null/blank вместо строкового `expression` |
| **D-10** | Расхождение кредов `application.yaml` ↔ `.env` ↔ `docker-compose.yml`. | Проект не стартует на чистой машине. | ✅ исправлен (T-02) |
| **D-11** | `EditablePageService.update` собирает ответ до коммита, а `updatedAt` проставляется `@PreUpdate` в момент flush. | `PUT /api/pages/{slug}` возвращает прежнюю дату правки, в БД при этом новая; клиент видит верное время только после перезапроса. | ⏳ открыт, по плану: T-32 |

Открытые дефекты и новые находки ревью 2026-07-27 разложены на тикеты в [BACKLOG.md](BACKLOG.md).

---

## 11. Вопросы для самопроверки

Если ответа на вопрос нет — стоит вернуться к соответствующему разделу.

1. Что произойдёт, если убрать `@EnableMethodSecurity` из `SecurityConfig`?
2. Почему при невалидном токене 401 отдаёт `AuthenticationEntryPoint`, вызванный прямо из фильтра, а `GlobalExceptionHandler` для этого не годится?
3. Где физически хранится «пользователь залогинен» между фильтром и контроллером?
4. Почему `SecurityUser` — отдельный класс, а не интерфейс на `User`?
5. Что вернёт `hasRole('ROLE_ADMIN')` для админа — и почему это ловушка?
6. Зачем `ddl-auto: validate`, если есть `update`?
7. Что сделает Hibernate при `findAll()` в `TeacherRepository`, если убрать `@EntityGraph`?
8. Почему `@Valid` обязателен, хотя аннотации стоят на полях DTO?
9. Почему в JWT нельзя класть пароль, если он подписан?
10. Что сломается, если у `NewsPost.author` поменять `LAZY` на `EAGER`?
