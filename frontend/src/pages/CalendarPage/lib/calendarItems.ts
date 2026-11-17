import type { UserEvent } from '@shared/types';

/**
 * Событие в том виде, в каком его ест календарь: подмножество `EventInput`
 * FullCalendar, но без импорта оттуда — библиотека приезжает ленивым
 * куском, а эта функция работает в основном и в тестах.
 */
export type CalendarItem = {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  color: string;
};

/** `YYYY-MM-DD` местного дня — дата без времени и без пояса. */
function localDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${String(date.getFullYear())}-${month}-${day}`;
}

/**
 * События ответа — в события календаря.
 *
 * **«Весь день»: конец сдвигается на день вперёд.** У бэкенда конец
 * такого события — полночь **последнего** дня (так писал старый портал,
 * `startOfDay(end)`, и `angular-calendar` читал его включительно),
 * а FullCalendar считает конец исключающим. Без сдвига трёхдневная
 * «Методическая неделя» 10–12 числа нарисовалась бы на 10–11, а
 * однодневное событие с равными началом и концом — нулевой длины.
 *
 * Даты «весь день» уходят строкой `YYYY-MM-DD` местного дня, а не
 * моментом: момент полуночи по Москве — это 21:00 предыдущего дня
 * в UTC, и календарь в другом поясе сдвинул бы событие на день назад.
 *
 * Остальные события уходят моментами как есть, календарь сам переводит
 * их в пояс браузера — как и `formatEventPeriod` в подписи.
 */
export function calendarItems(events: readonly UserEvent[]): CalendarItem[] {
  return events.map((event) => {
    const base = { id: String(event.id), title: event.name, color: event.color };

    if (!event.allDay) {
      return { ...base, start: event.startedAt, end: event.endedAt, allDay: false };
    }

    const start = new Date(event.startedAt);
    const last = new Date(event.endedAt);
    const dayAfter = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1);

    return { ...base, start: localDateKey(start), end: localDateKey(dayAfter), allDay: true };
  });
}
