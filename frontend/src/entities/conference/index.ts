/**
 * Публичный вход в сущность «конференция»: снаружи берут отсюда,
 * а не из `api/ui/lib` напрямую.
 *
 * Сущность знает только чтение — список и одно объявление. Создание, правку
 * и удаление принесёт фича админки (F-45); лежать они будут там:
 * `entities` описывает предметную область, действия пользователя — дело
 * `features`.
 *
 * `conferenceKeys` наружу не выходит по той же причине, что `newsKeys`:
 * инвалидировать кэш сегодня некому — правки нет. Понадобится админке —
 * добавим строку.
 */
export { conferenceListQuery, conferenceItemQuery } from './api/conferenceQueries';
export { findCachedConference } from './lib/cachedConference';
export { conferenceDatesLabel } from './lib/conferencePresenters';
export { ConferenceCard } from './ui/ConferenceCard';
export { ConferenceCardSkeleton } from './ui/ConferenceCardSkeleton';
