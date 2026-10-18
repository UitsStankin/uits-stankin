import type { ClassTime, ScheduleLesson, TeacherSchedule } from '@shared/types';

const CLASS_START: Record<ClassTime, string> = {
  1: '8:30',
  2: '10:20',
  3: '12:20',
  4: '14:10',
  5: '16:00',
  6: '18:00',
  7: '19:40',
  8: '21:20',
};

export const WEEK_DAYS = [
  { number: 1, name: 'Понедельник', short: 'Пн' },
  { number: 2, name: 'Вторник', short: 'Вт' },
  { number: 3, name: 'Среда', short: 'Ср' },
  { number: 4, name: 'Четверг', short: 'Чт' },
  { number: 5, name: 'Пятница', short: 'Пт' },
  { number: 6, name: 'Суббота', short: 'Сб' },
] as const;

export type DayNumber = (typeof WEEK_DAYS)[number]['number'];

export function classStartTime(classTime: ClassTime): string {
  return CLASS_START[classTime];
}

/** `08:30:00` и `08:30` — одно и то же время. */
export function trimSeconds(time: string): string {
  return time.replace(/^(\d{1,2}:\d{2}):\d{2}$/, '$1');
}

/** «Иванов Иван Иванович» → «Иванов И. И.». */
export function shortName(fullName: string): string {
  const [last, ...rest] = fullName.trim().split(/\s+/);
  const initials = rest.map((part) => `${part.charAt(0)}.`).join(' ');
  return [last, initials].filter(Boolean).join(' ');
}

/** Период проведения первой даты пары: «16.03–27.04, через неделю» либо одна дата. */
export function lessonPeriod(lesson: ScheduleLesson): string | null {
  const first = lesson.dates[0];
  if (!first) return null;
  if (!first.endDate) return first.startDate;
  return `${first.startDate}–${first.endDate}${first.alternativelyPeriod ? ', через неделю' : ''}`;
}

export interface FoundLesson extends ScheduleLesson {
  teacher: string;
  /** Нашлось по фамилии преподавателя, а не по группе: подпись преподавателя тогда не нужна. */
  byTeacher: boolean;
}

/** Пары, подходящие под запрос: по фамилии преподавателя или по коду группы. */
export function findLessons(schedules: readonly TeacherSchedule[], rawQuery: string): FoundLesson[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return [];

  return schedules.flatMap((schedule) => {
    const byTeacher = schedule.teacherName.toLowerCase().includes(query);
    return schedule.lessons
      .filter((lesson) => byTeacher || lesson.group.toLowerCase().includes(query))
      .map((lesson) => ({ ...lesson, teacher: shortName(schedule.teacherName), byTeacher }));
  });
}
