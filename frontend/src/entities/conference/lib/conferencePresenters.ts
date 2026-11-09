/**
 * Даты проведения конференции — в вид, пригодный для показа.
 *
 * Даты в контракте календарные (`YYYY-MM-DD`), без времени и без смещения
 * зоны — сознательно: конференция проходит «14 октября» по местному времени
 * площадки, а не в момент на шкале UTC (docs/API.md, «Конференции»).
 * Поэтому разбирать их общим `new Date(iso)`, как делает
 * `shared/lib/formatDate.ts` с `createdAt`, **нельзя**: голую дату он
 * считает полуночью UTC, и в браузере западнее Гринвича 14 октября
 * показалось бы 13-м. Дата собирается из компонентов — это местная полночь,
 * которую локальный форматтер уже не сдвинет.
 *
 * Диапазон форматирует `formatRange`, а не склейка двух дат строкой:
 * он сам убирает повторы — «14–16 октября 2026 г.» вместо
 * «14 октября 2026 г. — 16 октября 2026 г.», а месяц и год оставляет,
 * только когда они у краёв разные. Перепутанные края (`endDate` раньше
 * `startDate`) страницу не роняют — `formatRange` формирует строку как есть,
 * не бросаясь; в данных такого и не бывает: на сохранении это `400`.
 *
 * Форматтер создаётся один раз на модуль — `Intl.DateTimeFormat` дорогой
 * конструктор, и в списке из двадцати карточек разница заметна.
 */

const datesFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/**
 * «14–16 октября 2026 г.», «14 октября 2026 г.» у однодневной
 * (`endDate: null` — единственное её представление, равенство дат
 * нормализует бэкенд) — либо `null`, когда дат нет или они не разобрались.
 *
 * `endDate` без `startDate` не показывается вовсе: по контракту такая пара
 * не сохраняется, а рисовать одинокий конец диапазона не по чему.
 */
export function conferenceDatesLabel(
  startDate: string | null,
  endDate: string | null,
): string | null {
  const start = parseCalendarDate(startDate);
  if (start === null) return null;

  const end = parseCalendarDate(endDate);
  return end === null ? datesFormatter.format(start) : datesFormatter.formatRange(start, end);
}

/**
 * `YYYY-MM-DD` → полночь по местному времени, либо `null` на мусоре.
 *
 * Сверка компонентов после сборки — не паранойя: `new Date(2026, 1, 30)`
 * молча перекатывается во 2 марта, и «30 февраля» из битых данных
 * показалось бы настоящей датой, а не отсутствием даты.
 */
function parseCalendarDate(value: string | null): Date | null {
  if (value === null) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match === null) return null;

  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day);

  const isRolledOver =
    date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day;
  return isRolledOver ? null : date;
}
