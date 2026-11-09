/**
 * Публичный вход в сущность «конференция»: снаружи берут отсюда,
 * а не из `api/ui/lib` напрямую.
 *
 * Сущность знает только чтение — список и одно объявление, публичные,
 * и модераторский список. Создание, правку и удаление приносит фича админки
 * (`features/manage-conferences`); лежат они там: `entities` описывает
 * предметную область, действия пользователя — дело `features`.
 *
 * `conferenceKeys` наружу вышел с F-45 по той же причине, что `newsKeys`
 * с F-43: после `POST`, `PUT` и `DELETE` фиче админки нужно сбросить кэш
 * целиком — правка одного объявления меняет и админский список,
 * и публичный, и открытое объявление.
 */
export {
  conferenceListQuery,
  conferenceItemQuery,
  allConferencesListQuery,
  conferenceKeys,
} from './api/conferenceQueries';
export { findCachedConference } from './lib/cachedConference';
export { conferenceDatesLabel } from './lib/conferencePresenters';
export { ConferenceCard } from './ui/ConferenceCard';
export { ConferenceCardSkeleton } from './ui/ConferenceCardSkeleton';
