import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import {
  type CalendarDay,
  type ScheduleDay,
  calendarDayOf,
  formatWeekRange,
  lessonsOfWeek,
  lessonWeeks,
  nearestLessonWeek,
  teacherScheduleQuery,
  weekStart,
} from '@entities/schedule';
import { isApiError } from '@shared/api';

/** Подсказка под пустой неделей: куда листать, чтобы увидеть пары. */
export type NearestWeekHint = {
  /** «16–21 марта 2026 г.». */
  label: string;
  /** `true` — неделя впереди, `false` — семестр уже кончился, она позади. */
  isAhead: boolean;
};

/** Что блоку расписания нужно знать о своём запросе и неделе. */
export type TeacherScheduleState = {
  /** Пары есть хоть в какую-то неделю. Нет — блока нет. */
  hasSchedule: boolean;
  days: readonly ScheduleDay[];
  /** Сегодняшний день — его колонка подсвечивается. */
  today: CalendarDay;
  weekLabel: string;
  isCurrentWeek: boolean;
  /** Только когда в показанной неделе пар нет, а в расписании — есть. */
  nearestWeek: NearestWeekHint | null;
  showPreviousWeek: () => void;
  showNextWeek: () => void;
  showCurrentWeek: () => void;
  showNearestWeek: () => void;
  isOffline: boolean;
  isError: boolean;
  errorMessage: string | null;
  refetch: () => void;
};

const WEEK = 7;

/**
 * Расписание пар преподавателя на его карточке — ручка
 * `GET /api/public/teachers/{id}/schedule` (F-55).
 *
 * Живёт при карточке, а не своей страницей: в оригинале это была одна
 * из вкладок карточки, своего адреса у расписания одного преподавателя
 * нет. Запрос уходит параллельно с запросом карточки — по той же
 * причине, что у достижений (`useTeacherAchievements`).
 *
 * **Неделя.** Открывается текущая, как в оригинале, и листается кнопками.
 * Неделя — состояние блока, а не адреса: ссылкой на «расписание на неделю
 * 16 марта» никто не делится, а `?week=` в адресе карточки ломал бы
 * ссылки на саму карточку. Листание запросов не порождает — ответ один
 * на весь семестр.
 *
 * **Пустая неделя при непустом расписании** — обычное дело, а не край:
 * каникулы, сессия, и главное — расписание, загруженное на весенний
 * семестр, открытое осенью. Оригинал в этом случае показывал пустую сетку,
 * и посетитель решал, что пар нет вовсе. Здесь под пустой неделей стоит
 * ближайшая неделя с парами и кнопка перейти к ней.
 *
 * **Год** — текущий, правило оригинала; его край разобран
 * в `entities/schedule/lib/scheduleWeek.ts`.
 *
 * **`404`** у этой ручки значит «преподавателя нет», а это уже сказала
 * карточка; блок в этом случае молчит, а не дублирует её сбоем.
 */
export function useTeacherSchedule(teacherId: number | null): TeacherScheduleState {
  const query = useQuery({
    ...teacherScheduleQuery(teacherId ?? 0),
    // Битый `id` в адресе в запрос не уходит — как у достижений.
    enabled: teacherId !== null,
  });

  // `null` — «текущая неделя»: так блок, открытый вечером в воскресенье
  // и оставленный до утра, сам переедет на новую неделю при перерисовке.
  const [chosenWeek, setChosenWeek] = useState<CalendarDay | null>(null);

  const now = new Date();
  const today = calendarDayOf(now);
  const year = now.getFullYear();
  // Воскресенья в сетке нет, и в воскресенье «текущая» — завтрашняя неделя:
  // прошедшая, где сегодняшнего дня даже не видно, посетителю ни к чему.
  // `today + 1` с понедельника по субботу остаётся в той же неделе.
  const currentWeek = weekStart(today + 1);
  const week = chosenWeek ?? currentWeek;

  const lessons = query.data?.lessons ?? [];
  const weeks = lessonWeeks(lessons, year);
  const days = lessonsOfWeek(lessons, week, year);
  const isWeekEmpty = days.every((day) => day.lessons.length === 0);

  const nearest = isWeekEmpty ? nearestLessonWeek(weeks, week) : null;

  const isNotFound = isApiError(query.error) && query.error.status === 404;

  return {
    hasSchedule: weeks.length > 0,
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
    /** Запрос приостановлен: нет сети либо вкладка в фоне, показать нечего. */
    isOffline: query.isPaused && query.data === undefined,
    isError: query.isError && !isNotFound,
    errorMessage: query.error?.message ?? null,
    refetch: () => void query.refetch(),
  };
}
