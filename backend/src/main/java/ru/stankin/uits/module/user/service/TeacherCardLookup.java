package ru.stankin.uits.module.user.service;

import java.util.Optional;

/**
 * Знает, привязана ли к учётной записи карточка преподавателя.
 *
 * <p>Интерфейс объявлен в модуле user, а реализация живёт в staff: спрашивать
 * чужой репозиторий напрямую нельзя, а зависимость user → staff замкнула бы цикл —
 * staff уже ходит в user.service (по образцу {@code FileUsageProbe}).
 */
public interface TeacherCardLookup {

    Optional<Long> cardIdByUserId(long userId);
}
