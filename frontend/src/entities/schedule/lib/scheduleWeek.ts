import type { ScheduleLesson, ScheduleLessonDate, WeekDay } from '@shared/types';

import { type CalendarDay, parseDayMonth, weekStart } from './calendarDay';

/**
 * Разворачивание расписания в конкретную неделю.
 *
 * Контракт отдаёт сетку семестра: пару (день недели и номер) и периоды
 * `ДД.ММ` без года, каждую неделю или через неделю. Какие пары идут
 * в неделю, которую смотрит посетитель, — работа клиента (docs/API.md,
 * «Сводное расписание», последний абзац).
 *
 * **Год.** В PDF его нет, восстановить нечем — берётся год, который
 * передал вызывающий, а страница передаёт текущий. Это правило старого
 * портала (`Schedule.toCalendarEvents`), и у него есть известный край:
 * расписание весеннего семестра, открытое в декабре, ляжет на весну
 * будущего года, а не прошедшего. Период, чей конец раньше начала
 * (`15.12`–`20.01`), считается перешедшим через Новый год.
 *
 * **День недели берётся из `weekNumber`, а не из даты.** Период
 * определяет только, *в какие недели* идёт пара: от недели первой даты
 * до недели последней, с шагом в одну или две недели, считая от первой.
 * В правильный год день недели даты и `weekNumber` совпадают, и разницы
 * нет. В неправильный (см. выше) даты съезжают по дням недели — пара,
 * поставленная по дате, уехала бы с понедельника на вторник, а по
 * `weekNumber` остаётся там, где она есть в бумажном расписании.
 * Старый портал ставил по дате и в таком случае рисовал сдвинутую сетку.
 */

/** Один день недели в развёрнутом расписании. */
export type ScheduleDay = {
  day: CalendarDay;
  weekDay: WeekDay;
  /** В порядке ответа — по номеру пары, затем по `id`. */
  lessons: readonly ScheduleLesson[];
};

type Period = {
  firstWeek: CalendarDay;
  lastWeek: CalendarDay;
  /** Шаг в днях: 7 — каждую неделю, 14 — через неделю. */
  step: 7 | 14;
};

const WEEK_DAYS: readonly WeekDay[] = [1, 2, 3, 4, 5, 6];

/**
 * Период пары в неделях. Нечитаемая дата даёт `null`: такой период
 * пропускается, а не роняет всю сетку — одна битая строка из PDF
 * не должна стоить посетителю расписания целиком.
 */
function periodOf(date: ScheduleLessonDate, year: number): Period | null {
  const start = parseDayMonth(date.startDate, year);
  if (start === null) return null;

  if (date.endDate === null) {
    // Разовое занятие: одна неделя, шаг неважен.
    return { firstWeek: weekStart(start), lastWeek: weekStart(start), step: 7 };
  }

  let end = parseDayMonth(date.endDate, year);
  if (end !== null && end < start) end = parseDayMonth(date.endDate, year + 1);
  if (end === null) return null;

  return {
    firstWeek: weekStart(start),
    lastWeek: weekStart(end),
    step: date.alternativelyPeriod ? 14 : 7,
  };
}

function occursInWeek(period: Period, monday: CalendarDay): boolean {
  return (
    monday >= period.firstWeek &&
    monday <= period.lastWeek &&
    (monday - period.firstWeek) % period.step === 0
  );
}

/**
 * Шесть дней недели — с понедельника по субботу — и пары каждого.
 * Дни без пар в результате есть, с пустым списком: сетке нужен каждый.
 *
 * `monday` — понедельник недели; день из её середины тоже годится,
 * он приводится к понедельнику.
 */
export function lessonsOfWeek(
  lessons: readonly ScheduleLesson[],
  monday: CalendarDay,
  year: number,
): ScheduleDay[] {
  const week = weekStart(monday);

  return WEEK_DAYS.map((weekDay) => ({
    day: week + weekDay - 1,
    weekDay,
    lessons: lessons.filter(
      (lesson) =>
        lesson.weekNumber === weekDay &&
        lesson.dates.some((date) => {
          const period = periodOf(date, year);
          return period !== null && occursInWeek(period, week);
        }),
    ),
  }));
}

/** Понедельники всех недель, в которые есть хоть одна пара, по возрастанию. */
export function lessonWeeks(lessons: readonly ScheduleLesson[], year: number): CalendarDay[] {
  const weeks = new Set<CalendarDay>();

  for (const lesson of lessons) {
    for (const date of lesson.dates) {
      const period = periodOf(date, year);
      if (period === null) continue;
      for (let week = period.firstWeek; week <= period.lastWeek; week += period.step) {
        weeks.add(week);
      }
    }
  }

  return [...weeks].sort((a, b) => a - b);
}

/**
 * Ближайшая к `from` неделя с парами: первая не раньше неё, а если
 * семестр уже кончился — последняя. Пар нет вовсе — `null`.
 */
export function nearestLessonWeek(
  weeks: readonly CalendarDay[],
  from: CalendarDay,
): CalendarDay | null {
  const monday = weekStart(from);
  return weeks.find((week) => week >= monday) ?? weeks.at(-1) ?? null;
}
