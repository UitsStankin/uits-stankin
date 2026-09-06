package ru.stankin.uits.module.gradesheets.service;

import ru.stankin.uits.module.staff.entity.Subject;

import java.util.Optional;

/**
 * Ищет дисциплину справочника по названию, без учёта регистра.
 *
 * <p>Объявлен здесь, реализован в staff — по той же причине, что и
 * {@link TeacherByNameLookup}.
 */
public interface SubjectByNameLookup {

    Optional<Subject> byName(String name);
}
