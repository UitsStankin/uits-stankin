import { describe, expect, it } from 'vitest';

import { makeEvent } from '@shared/api/mocks';

import { calendarItems } from './calendarItems';

/** Местное время → ISO: тест не зависит от пояса машины. */
const at = (month: number, day: number, hour = 0, minute = 0) =>
  new Date(2026, month - 1, day, hour, minute).toISOString();

describe('calendarItems', () => {
  it('обычное событие уходит моментами как есть, с названием и цветом', () => {
    const event = makeEvent({ id: 7, startedAt: at(11, 3, 10), endedAt: at(11, 3, 11, 30) });

    expect(calendarItems([event])).toEqual([
      {
        id: '7',
        title: 'Заседание кафедры',
        start: event.startedAt,
        end: event.endedAt,
        allDay: false,
        color: '#3F51B5',
      },
    ]);
  });

  /**
   * Конец «весь день» у бэкенда включительный, у FullCalendar —
   * исключающий: 10–12 ноября обязаны дойти до календаря как 10–13.
   */
  it('«весь день» — даты без времени, конец на день позже', () => {
    const [item] = calendarItems([
      makeEvent({ startedAt: at(11, 10), endedAt: at(11, 12), allDay: true }),
    ]);

    expect(item).toMatchObject({ start: '2026-11-10', end: '2026-11-13', allDay: true });
  });

  it('«весь день» на один день — не нулевой длины', () => {
    const [item] = calendarItems([
      makeEvent({ startedAt: at(11, 10), endedAt: at(11, 10), allDay: true }),
    ]);

    expect(item).toMatchObject({ start: '2026-11-10', end: '2026-11-11' });
  });

  it('«весь день» в конце года переходит в следующий', () => {
    const [item] = calendarItems([
      makeEvent({ startedAt: at(12, 30), endedAt: at(12, 31), allDay: true }),
    ]);

    expect(item).toMatchObject({ start: '2026-12-30', end: '2027-01-01' });
  });
});
