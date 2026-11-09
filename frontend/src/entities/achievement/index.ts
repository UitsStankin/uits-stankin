/**
 * Публичный вход в сущность «достижение»: снаружи берут отсюда,
 * а не из `api/ui/lib` напрямую.
 *
 * Сущность знает только чтение — раздел, одно достижение и достижения
 * одного преподавателя, публичные, и модераторский список. Создание,
 * правку и удаление приносит фича админки (`features/manage-achievements`);
 * лежат они там: `entities` описывает предметную область, действия
 * пользователя — дело `features`.
 *
 * `achievementKeys` наружу вышел с F-45 по той же причине, что `newsKeys`
 * с F-43: после `POST`, `PUT` и `DELETE` фиче админки нужно сбросить кэш
 * целиком — правка одного достижения меняет и админский список, и раздел
 * на сайте, и блок на карточке преподавателя, и открытое достижение.
 */
export {
  achievementListQuery,
  achievementItemQuery,
  teacherAchievementsQuery,
  allAchievementsListQuery,
  achievementKeys,
} from './api/achievementQueries';
export { findCachedAchievement } from './lib/cachedAchievement';
export { AchievementCard } from './ui/AchievementCard';
export { AchievementCardSkeleton } from './ui/AchievementCardSkeleton';
