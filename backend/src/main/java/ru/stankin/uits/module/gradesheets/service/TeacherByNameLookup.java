package ru.stankin.uits.module.gradesheets.service;

import ru.stankin.uits.module.staff.entity.Teacher;

import java.util.List;

/**
 * Отдаёт карточки ППС с заданной фамилией.
 *
 * <p>Интерфейс объявлен в модуле ведомостей, а реализация живёт в staff — по образцу
 * {@code TeacherCardLookup}: спрашивать чужой репозиторий напрямую нельзя. Отбор
 * по инициалам остаётся здесь: в ведомости преподаватель записан строкой
 * «Чеканин В.А.», и разбирать её — дело того, кто эту строку получил.
 */
public interface TeacherByNameLookup {

    List<Teacher> byLastName(String lastName);
}
