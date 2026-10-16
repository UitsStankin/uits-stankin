/**
 * Публичный вход в сущность «достижение»: снаружи берут отсюда,
 * а не из `api/ui/lib` напрямую.
 *
 * Сущность знает только чтение — раздел, одно достижение и достижения
 * одного преподавателя. Создание, правку и удаление принесёт фича админки
 * (F-45); лежать они будут там: `entities` описывает предметную область,
 * действия пользователя — дело `features`.
 *
 * `achievementKeys` наружу не выходит по той же причине, что `newsKeys`:
 * инвалидировать кэш сегодня некому — правки нет. Понадобится админке —
 * добавим строку.
 */
export {
  achievementListQuery,
  achievementItemQuery,
  teacherAchievementsQuery,
} from './api/achievementQueries';
export { findCachedAchievement } from './lib/cachedAchievement';
export { AchievementCard } from './ui/AchievementCard';
export { AchievementCardSkeleton } from './ui/AchievementCardSkeleton';
