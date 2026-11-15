import { useState } from 'react';

import type { ScheduleLesson } from '@shared/types';

import { type CalendarDay, calendarDayOf, formatWeekRange, weekStart } from '../lib/calendarDay';
import { type ScheduleDay, lessonsOfWeek, lessonWeeks, nearestLessonWeek } from '../lib/scheduleWeek';

/** Подсказка под пустой неделей: куда листать, чтобы увидеть пары. */
export type NearestWeekHint = {
  /** «16–21 марта 2026 г.». */
  label: string;
  /** `true` — неделя впереди, `false` — семестр уже кончился, она позади. */
  isAhead: boolean;
};

/** Показанная неделя расписания и листание. */
export type ScheduleWeekState<L extends ScheduleLesson = ScheduleLesson> = {
  /** Пары есть хоть в какую-то неделю. */
  hasLessons: boolean;
  days: readonly ScheduleDay<L>[];
  /** Сегодняшний день — его карточка подсвечивается. */
  today: CalendarDay;
  weekLabel: string;
  isCurrentWeek: boolean;
  /** Только когда в показанной неделе пар нет, а в расписании — есть. */
  nearestWeek: NearestWeekHint | null;
  showPreviousWeek: () => void;
  showNextWeek: () => void;
  showCurrentWeek: () => void;
  showNearestWeek: () => void;
};

const WEEK = 7;

/**
 * Неделя, которую смотрит посетитель, и пары в ней — общее у карточки
 * преподавателя (F-55) и сводного расписания (F-57).
 *
 * **Неделя — состояние, а не адрес.** Открывается текущая, как в оригинале,
 * и листается кнопками. Ссылкой на «расписание на неделю 16 марта» никто
 * не делится, а `?week=` в адресе ломал бы ссылки на саму страницу.
 * Листание запросов не порождает — ответ один на весь семестр.
 *
 * **Пустая неделя при непустом расписании** — обычное дело, а не край:
 * каникулы, сессия, и главное — расписание весеннего семестра, открытое
 * осенью. Оригинал показывал пустую сетку, и посетитель решал, что пар
 * нет вовсе. Здесь пустая неделя знает ближайшую с парами.
 *
 * **Год** — текущий, правило оригинала; его край разобран
 * в `lib/scheduleWeek.ts`.
 */
export function useScheduleWeek<L extends ScheduleLesson>(
  lessons: readonly L[],
): ScheduleWeekState<L> {
  // `null` — «текущая неделя»: так страница, открытая вечером в воскресенье
  // и оставленная до утра, сама переедет на новую неделю при перерисовке.
  const [chosenWeek, setChosenWeek] = useState<CalendarDay | null>(null);

  const now = new Date();
  const today = calendarDayOf(now);
  const year = now.getFullYear();
  // Воскресенья в сетке нет, и в воскресенье «текущая» — завтрашняя неделя:
  // прошедшая, где сегодняшнего дня даже не видно, посетителю ни к чему.
  // `today + 1` с понедельника по субботу остаётся в той же неделе.
  const currentWeek = weekStart(today + 1);
  const week = chosenWeek ?? currentWeek;

  const weeks = lessonWeeks(lessons, year);
  const days = lessonsOfWeek(lessons, week, year);
  const isWeekEmpty = days.every((day) => day.lessons.length === 0);

  const nearest = isWeekEmpty ? nearestLessonWeek(weeks, week) : null;

  return {
    hasLessons: weeks.length > 0,
    days,
    today,
    weekLabel: formatWeekRange(week),
    isCurrentWeek: week === currentWeek,
    nearestWeek:
      nearest === null ? null : { label: formatWeekRange(nearest), isAhead: nearest > week },
    // Сдвиг — от предыдущего состояния, а не от `week` этой отрисовки:
    // два клика быстрее перерисовки иначе дали бы один шаг.
    showPreviousWeek: () => setChosenWeek((chosen) => (chosen ?? currentWeek) - WEEK),
    showNextWeek: () => setChosenWeek((chosen) => (chosen ?? currentWeek) + WEEK),
    showCurrentWeek: () => setChosenWeek(null),
    showNearestWeek: () => {
      if (nearest !== null) setChosenWeek(nearest);
    },
  };
}
