import { describe, expect, it } from 'vitest';

import { formatEventPeriod } from './eventPresenters';

/** Местное время → ISO: тест не зависит от пояса машины. */
const at = (month: number, day: number, hour = 0, minute = 0) =>
  new Date(2026, month - 1, day, hour, minute).toISOString();

/**
 * ICU разделяет числа и «г.» то обычным пробелом, то узким неразрывным
 * (U+202F), и от версии к версии это менялось — тот же приём, что
 * в `conferencePresenters.test.ts`. Тире остаётся как есть: диапазон
 * собирает именно оно, и дефис на его месте значил бы ручную склейку.
 */
const period = (...args: Parameters<typeof formatEventPeriod>) =>
  formatEventPeriod(...args).replace(/\s/g, ' ');

describe('formatEventPeriod', () => {
  it('в пределах дня — дата раз и два времени', () => {
    expect(
      period({
        startedAt: at(11, 3, 10),
        endedAt: at(11, 3, 11, 30),
        allDay: false,
      }),
    ).toBe('3 ноября 2026 г., 10:00–11:30');
  });

  it('через полночь — обе даты', () => {
    expect(
      period({
        startedAt: at(11, 17, 22),
        endedAt: at(11, 18, 2),
        allDay: false,
      }),
    ).toBe('17 ноября 2026 г. в 22:00 – 18 ноября 2026 г. в 02:00');
  });

  it('совпавшие начало и конец — один момент', () => {
    expect(
      period({
        startedAt: at(11, 24, 12),
        endedAt: at(11, 24, 12),
        allDay: false,
      }),
    ).toBe('24 ноября 2026 г. в 12:00');
  });

  it('«весь день» — без времени, конец включительно', () => {
    expect(
      period({
        startedAt: at(11, 10),
        endedAt: at(11, 12),
        allDay: true,
      }),
    ).toBe('10–12 ноября 2026 г., весь день');
  });

  it('«весь день» на один день — одна дата', () => {
    expect(
      period({
        startedAt: at(11, 10),
        endedAt: at(11, 10),
        allDay: true,
      }),
    ).toBe('10 ноября 2026 г., весь день');
  });

  it('«весь день» через месяц — оба месяца', () => {
    expect(
      period({
        startedAt: at(11, 30),
        endedAt: at(12, 2),
        allDay: true,
      }),
    ).toBe('30 ноября – 2 декабря 2026 г., весь день');
  });
});
