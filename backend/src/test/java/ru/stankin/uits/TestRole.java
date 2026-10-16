package ru.stankin.uits;

/**
 * Роли в терминах тестов.
 *
 * <p>В базе роли лежат булевыми флагами (`is_superuser`, `is_moderator`, `is_teacher`),
 * а Spring Security видит их как authority `ROLE_*` — превращение делает
 * {@link ru.stankin.uits.security.SecurityUser}. Этот enum избавляет тесты
 * от знания о флагах: тест просит роль, а не выставляет колонку.
 *
 * <p>{@link #USER} не выставляет ни одного флага: authority `ROLE_USER`
 * выдаётся каждому аутентифицированному пользователю, отдельного признака
 * «просто пользователь» в базе нет.
 */
public enum TestRole {
    ADMIN,
    MODERATOR,
    TEACHER,
    USER
}
