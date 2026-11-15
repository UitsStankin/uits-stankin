/**
 * Публичный вход в сущность «расписание»: снаружи берут отсюда,
 * а не из `api/lib/ui` напрямую.
 *
 * Сущность знает только чтение: пары одного преподавателя (F-55)
 * и экзамены — его и сводные, с PDF из карточек (F-56), и сводное
 * расписание пар (F-57). Неделя и листание (`model/useScheduleWeek.ts`)
 * общие у карточки и сводной.
 * Импорт PDF — действие модератора, и ляжет он в фичу.
 */
export { fetchExamFiles, fetchExamsSummary, fetchTeacherExams } from './api/examApi';
export { fetchScheduleSummary, fetchTeacherSchedule } from './api/scheduleApi';
export {
  examFilesQuery,
  examsSummaryQuery,
  scheduleKeys,
  scheduleSummaryQuery,
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
  type LessonSlot,
  type SummaryLesson,
  type SummaryTeacher,
  lessonSlots,
  summaryLessons,
  summaryTeachers,
} from './lib/summary';
export {
  type ScheduleDay,
  lessonsOfWeek,
  lessonWeeks,
  nearestLessonWeek,
} from './lib/scheduleWeek';
export {
  type NearestWeekHint,
  type ScheduleWeekState,
  useScheduleWeek,
} from './model/useScheduleWeek';
export { ExamDayCard } from './ui/ExamDayCard';
export { NearestWeekNotice, WeekNavigation } from './ui/WeekNavigation';
