/**
 * Публичный вход в сущность «расписание»: снаружи берут отсюда,
 * а не из `api/lib` напрямую.
 *
 * Сущность знает только чтение. Пока это расписание одного преподавателя
 * (F-55); сводное расписание и экзамены встанут сюда же — схема ответа
 * у них общая, и разворачивание периодов в неделю (`lib/scheduleWeek.ts`)
 * нужно им всем. Импорт PDF — действие модератора, и ляжет он в фичу.
 */
export { fetchTeacherSchedule } from './api/scheduleApi';
export { scheduleKeys, teacherScheduleQuery } from './api/scheduleQueries';
export {
  type CalendarDay,
  calendarDay,
  calendarDayOf,
  formatDayMonth,
  formatDayMonthYear,
  formatWeekRange,
  weekStart,
} from './lib/calendarDay';
export { classTimeRange } from './lib/classTimes';
export {
  type ScheduleDay,
  lessonsOfWeek,
  lessonWeeks,
  nearestLessonWeek,
} from './lib/scheduleWeek';
