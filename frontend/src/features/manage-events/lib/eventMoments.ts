/**
 * Перевод между моментами контракта (ISO-8601 со смещением) и тем, что
 * показывают родные поля формы: дата `YYYY-MM-DD` и время `HH:mm`
 * **местного** дня, в поясе браузера.
 *
 * Строки родных полей в `Date` через `new Date('2026-11-16')` не
 * разбираются: такая запись читается как полночь по UTC, и в Москве
 * это 03:00 — событие «весь день» уехало бы на три часа. Части берутся
 * руками и собираются конструктором с местным временем.
 */

const pad = (value: number) => String(value).padStart(2, '0');

/** `YYYY-MM-DD` местного дня. */
export function localDate(date: Date): string {
  return `${String(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * `HH:mm` местного времени. Секунды отбрасываются: у поля их нет,
 * и событие старого портала до `23:59:59` после правки кончится в `23:59`.
 */
export function localTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Местные дата и время — в момент для запроса. Уходит `toISOString()`,
 * то есть в UTC с `Z`: это то же ISO-8601 со смещением, бэкенд его
 * принимает и сам так отдаёт.
 *
 * Без времени — полночь: так пишется событие «весь день» (`UserEvent`).
 */
export function toMoment(date: string, time = '00:00'): string {
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);

  return new Date(year, month - 1, day, hours, minutes).toISOString();
}
