import { describe, expect, it } from 'vitest';

import { calendarTitle, containsDay, shiftAnchor, visibleRange } from './calendarNavigation';

/** Местная дата — как её и держит страница. */
const day = (year: number, month: number, date: number) => new Date(year, month - 1, date);

/** Узкие пробелы ICU — в обычные, как в `conferencePresenters.test.ts`. */
const title = (...args: Parameters<typeof calendarTitle>) =>
  calendarTitle(...args).replace(/\s/g, ' ');

describe('visibleRange', () => {
  it('неделя — с понедельника, даже если открыта в воскресенье', () => {
    // 22 ноября 2026 — воскресенье.
    expect(visibleRange('week', day(2026, 11, 22))).toEqual({
      start: day(2026, 11, 16),
      end: day(2026, 11, 23),
    });
  });

  it('месяц и список — одно и то же', () => {
    expect(visibleRange('list', day(2026, 11, 16))).toEqual(
      visibleRange('month', day(2026, 11, 16)),
    );
  });
});

describe('shiftAnchor', () => {
  it('месяц листается от первого числа — февраль не теряется после 31 января', () => {
    expect(shiftAnchor('month', day(2027, 1, 31), 1)).toEqual(day(2027, 2, 1));
  });

  it('неделя — на семь дней от понедельника', () => {
    expect(shiftAnchor('week', day(2026, 11, 18), -1)).toEqual(day(2026, 11, 9));
  });

  it('день — через Новый год', () => {
    expect(shiftAnchor('day', day(2026, 12, 31), 1)).toEqual(day(2027, 1, 1));
  });
});

describe('containsDay', () => {
  it('сегодня в видимом месяце — да, в соседнем — нет', () => {
    expect(containsDay('month', day(2026, 11, 1), day(2026, 11, 16))).toBe(true);
    expect(containsDay('month', day(2026, 12, 1), day(2026, 11, 16))).toBe(false);
  });

  it('последний день недели ещё внутри, понедельник следующей — уже нет', () => {
    expect(containsDay('week', day(2026, 11, 16), day(2026, 11, 22))).toBe(true);
    expect(containsDay('week', day(2026, 11, 16), day(2026, 11, 23))).toBe(false);
  });
});

describe('calendarTitle', () => {
  it('месяц — «Ноябрь 2026», именительный падеж с заглавной', () => {
    expect(title('month', day(2026, 11, 16))).toBe('Ноябрь 2026');
  });

  it('неделя в одном месяце — одна дата месяца', () => {
    expect(title('week', day(2026, 11, 18))).toBe('16–22 ноября 2026 г.');
  });

  it('неделя через Новый год — обе даты с годом', () => {
    expect(title('week', day(2026, 12, 30))).toBe('28 декабря 2026 г. – 3 января 2027 г.');
  });

  it('день — с днём недели', () => {
    expect(title('day', day(2026, 11, 16))).toBe('Понедельник, 16 ноября 2026 г.');
  });
});
