/**
 * Публичный вход в сущность «расписание»: пары и экзамены.
 *
 * Сущность знает только чтение сводных выдач — ту часть, что нужна блоку
 * расписания на главной. Импорт PDF — дело админки, лежать он будет
 * в фиче правки.
 */
export { examSummaryQuery, scheduleSummaryQuery } from './api/scheduleQueries';
export {
  WEEK_DAYS,
  classStartTime,
  findLessons,
  lessonPeriod,
  shortName,
  trimSeconds,
} from './lib/schedulePresenters';
export type { DayNumber, FoundLesson } from './lib/schedulePresenters';
