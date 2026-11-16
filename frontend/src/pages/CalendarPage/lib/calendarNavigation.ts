/**
 * Вид календаря и листание — чистые функции над местными датами.
 *
 * Состояние «какой вид и какая дата» держит страница, а не FullCalendar:
 * его контроллер при смене даты отдаёт тот же объект, и React Compiler,
 * мемоизирующий по ссылке, показал бы заголовок вчерашнего месяца.
 * Календарь только следует за этим состоянием (`ui/EventCalendar`).
 */

/**
 * Месяц, неделя и день — как в оригинале; «список» — вкладка оригинала,
 * здесь это события того же месяца строками, с тем же листанием.
 */
export type CalendarViewKind = 'month' | 'week' | 'day' | 'list';

export const CALENDAR_VIEWS: readonly { kind: CalendarViewKind; title: string }[] = [
  { kind: 'month', title: 'Месяц' },
  { kind: 'week', title: 'Неделя' },
  { kind: 'day', title: 'День' },
  { kind: 'list', title: 'Список' },
];

/** Местная полночь того же дня. */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Понедельник недели `date` — неделя в портале с понедельника. */
function startOfWeek(date: Date): Date {
  const day = startOfDay(date);
  const sinceMonday = (day.getDay() + 6) % 7;

  return new Date(day.getFullYear(), day.getMonth(), day.getDate() - sinceMonday);
}

/**
 * Видимый промежуток `[start, end)`: месяц, неделя с понедельника или день.
 * Список показывает тот же месяц, что и сетка.
 */
export function visibleRange(view: CalendarViewKind, anchor: Date): { start: Date; end: Date } {
  switch (view) {
    case 'month':
    case 'list': {
      const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
      return { start, end: new Date(start.getFullYear(), start.getMonth() + 1, 1) };
    }
    case 'week': {
      const start = startOfWeek(anchor);
      return { start, end: new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7) };
    }
    case 'day': {
      const start = startOfDay(anchor);
      return { start, end: new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1) };
    }
  }
}

/**
 * Дата после шага «вперёд» (`+1`) или «назад» (`-1`).
 *
 * Месяц листается от первого числа: 31 января плюс месяц через
 * `setMonth` дало бы 3 марта, и февраль пропал бы из листания.
 */
export function shiftAnchor(view: CalendarViewKind, anchor: Date, step: 1 | -1): Date {
  const { start } = visibleRange(view, anchor);

  switch (view) {
    case 'month':
    case 'list':
      return new Date(start.getFullYear(), start.getMonth() + step, 1);
    case 'week':
      return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7 * step);
    case 'day':
      return new Date(start.getFullYear(), start.getMonth(), start.getDate() + step);
  }
}

/** Попадает ли `today` в видимый промежуток — кнопка «Сегодня» тогда не нужна. */
export function containsDay(view: CalendarViewKind, anchor: Date, today: Date): boolean {
  const { start, end } = visibleRange(view, anchor);

  return today >= start && today < end;
}

/** Форматтеры создаются раз на модуль: конструктор `Intl` дорогой. */
const monthFormatter = new Intl.DateTimeFormat('ru-RU', { month: 'long' });

const dayFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const weekDayFormatter = new Intl.DateTimeFormat('ru-RU', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/**
 * Заголовок над календарём:
 *
 * - месяц и список — «Ноябрь 2026», как у `angular-calendar` в оригинале;
 * - неделя — «16–22 ноября 2026 г.», через месяц и год `formatRange`
 *   сам называет оба;
 * - день — «Понедельник, 16 ноября 2026 г.».
 */
export function calendarTitle(view: CalendarViewKind, anchor: Date): string {
  const { start, end } = visibleRange(view, anchor);

  switch (view) {
    case 'month':
    case 'list':
      return `${capitalize(monthFormatter.format(start))} ${String(start.getFullYear())}`;
    case 'week': {
      const sunday = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 1);
      return dayFormatter.formatRange(start, sunday);
    }
    case 'day':
      return capitalize(weekDayFormatter.format(start));
  }
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
