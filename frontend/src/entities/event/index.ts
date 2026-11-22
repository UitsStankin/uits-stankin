/**
 * Публичный вход в сущность «событие календаря»: снаружи берут отсюда,
 * а не из `api/lib` напрямую.
 *
 * Сущность знает только чтение (F-59): все события пользователя одним
 * массивом и подписи к ним. Создание, правка и удаление — действия
 * пользователя, они в фиче `manage-events` (F-60) и после себя
 * сбрасывают здешний кэш целиком (`eventKeys.all`).
 *
 * Своего `ui` у сущности нет: событие рисует календарь, а он один —
 * на странице `/corp/calendar`.
 */
export { fetchAllEvents } from './api/eventApi';
export { eventKeys, eventsQuery } from './api/eventQueries';
export { EVENT_STATUS_LABELS, formatEventPeriod } from './lib/eventPresenters';
