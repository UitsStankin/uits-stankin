import type { EventStatus, UserEvent } from '@shared/types';

/** Подписи статуса — по смыслу старого портала, по-русски. */
export const EVENT_STATUS_LABELS: Readonly<Record<EventStatus, string>> = {
  NOT_STARTED: 'Не начато',
  IN_PROGRESS: 'В работе',
  COMPLETED: 'Завершено',
};

/** Форматтеры создаются раз на модуль: конструктор `Intl` дорогой. */
const dayFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const dayTimeFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/**
 * Когда идёт событие — одной строкой, в поясе браузера:
 *
 * - «3 ноября 2026 г., 10:00–11:30» — в пределах дня;
 * - «17 ноября 2026 г. в 22:00 – 18 ноября 2026 г. в 02:00» — через полночь;
 * - «3 ноября 2026 г. в 10:00» — начало и конец совпали;
 * - «10–12 ноября 2026 г., весь день» — «весь день» на несколько дней.
 *
 * Склейку диапазона делает `Intl.DateTimeFormat#formatRange`: он сам
 * опускает повторяющиеся месяц и год и сам решает, где ставить тире.
 * Свой разбор этих случаев был бы вторым, менее полным его вариантом.
 *
 * У «весь день» время не показывается вовсе: там оба момента — полночь,
 * и «00:00–00:00» читалось бы как событие нулевой длины. Конец там
 * включительный (`UserEvent`), поэтому диапазон дат берётся как есть.
 */
export function formatEventPeriod(
  event: Pick<UserEvent, 'startedAt' | 'endedAt' | 'allDay'>,
): string {
  const start = new Date(event.startedAt);
  const end = new Date(event.endedAt);

  if (event.allDay) return `${dayFormatter.formatRange(start, end)}, весь день`;

  return dayTimeFormatter.formatRange(start, end);
}
