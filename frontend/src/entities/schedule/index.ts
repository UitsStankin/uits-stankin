/**
 * Публичный вход в сущность «расписание»: снаружи берут отсюда,
 * а не из `api/lib/ui` напрямую.
 *
 * Сущность знает только чтение: пары одного преподавателя (F-55)
 * и экзамены — его и сводные, с PDF из карточек (F-56). Сводное
 * расписание пар встанет сюда же — схема ответа у него та же,
 * и разворачивание периодов в неделю (`lib/scheduleWeek.ts`) нужно и ему.
 * Импорт PDF — действие модератора, и ляжет он в фичу.
 */
export { fetchExamFiles, fetchExamsSummary, fetchTeacherExams } from './api/examApi';
export { fetchTeacherSchedule } from './api/scheduleApi';
export {
  examFilesQuery,
  examsSummaryQuery,
  scheduleKeys,
  teacherExamsQuery,
  teacherScheduleQuery,
} from './api/scheduleQueries';
export {
  type CalendarDay,
  calendarDay,
  calendarDayOf,
  formatDayMonth,
  formatDayMonthYear,
  formatWeekRange,
  weekStart,
} from './lib/calendarDay';
export { type ExamDay, type ScheduledExam, examDays, examGroups } from './lib/exams';
export { classTimeRange } from './lib/classTimes';
export {
  type ScheduleDay,
  lessonsOfWeek,
  lessonWeeks,
  nearestLessonWeek,
} from './lib/scheduleWeek';
export { ExamDayCard } from './ui/ExamDayCard';
