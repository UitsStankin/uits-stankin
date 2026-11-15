/**
 * Календарный день без часов и пояса — целое число дней от 1 января 1970.
 *
 * Расписанию нужны только даты: «какой это день недели», «сколько недель
 * между», «входит ли в период». `Date` с часами для этого — источник
 * ошибок на ровном месте: полночь по местному времени в UTC оказывается
 * вчерашним днём, а сутки на переходе часов длятся 23 или 25 часов.
 * Номер дня считается через `Date.UTC`, где ни того ни другого нет.
 */
export type CalendarDay = number;

const MS_PER_DAY = 86_400_000;

/** День по году, месяцу (1–12) и числу. */
export function calendarDay(year: number, month: number, day: number): CalendarDay {
  return Date.UTC(year, month - 1, day) / MS_PER_DAY;
}

/**
 * Сегодняшний день по **местному** календарю посетителя: у того,
 * у кого уже понедельник, неделя уже следующая.
 */
export function calendarDayOf(date: Date): CalendarDay {
  return calendarDay(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/** День недели: 1 — понедельник … 7 — воскресенье. */
export function isoWeekDay(day: CalendarDay): number {
  // 1 января 1970 года — четверг, четвёртый день недели.
  return ((((day + 3) % 7) + 7) % 7) + 1;
}

/** Понедельник недели, в которую попадает день. */
export function weekStart(day: CalendarDay): CalendarDay {
  return day - isoWeekDay(day) + 1;
}

/**
 * Дата из расписания, `ДД.ММ`, в день указанного года. Строка, не похожая
 * на дату, и несуществующее число (`31.02`) дают `null`, а не день
 * из соседнего месяца, как ответил бы `Date.UTC`.
 */
export function parseDayMonth(value: string, year: number): CalendarDay | null {
  const match = /^(\d{1,2})\.(\d{1,2})$/.exec(value.trim());
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const date = new Date(Date.UTC(year, month - 1, day));
  const exists = date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return exists ? calendarDay(year, month, day) : null;
}

/** Форматтеры создаются раз на модуль: конструктор `Intl` дорогой. */
const dayMonthFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});

const dayMonthYearFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

function toUtcDate(day: CalendarDay): Date {
  return new Date(day * MS_PER_DAY);
}

/** «16 марта». Пояс — UTC, потому что в UTC день и считался. */
export function formatDayMonth(day: CalendarDay): string {
  return dayMonthFormatter.format(toUtcDate(day));
}

/** «16 марта 2026 г.». */
export function formatDayMonthYear(day: CalendarDay): string {
  return dayMonthYearFormatter.format(toUtcDate(day));
}

/**
 * Неделя с понедельника по субботу: «16–21 марта 2026 г.»,
 * «30 марта – 4 апреля 2026 г.», через Новый год — с годом у обеих дат.
 * Воскресенья в сетке нет, и в подписи его тоже нет.
 */
export function formatWeekRange(monday: CalendarDay): string {
  const saturday = monday + 5;
  const from = toUtcDate(monday);
  const to = toUtcDate(saturday);

  if (from.getUTCFullYear() !== to.getUTCFullYear()) {
    return `${formatDayMonthYear(monday)} – ${formatDayMonthYear(saturday)}`;
  }
  if (from.getUTCMonth() !== to.getUTCMonth()) {
    return `${formatDayMonth(monday)} – ${formatDayMonthYear(saturday)}`;
  }
  return `${String(from.getUTCDate())}–${formatDayMonthYear(saturday)}`;
}
