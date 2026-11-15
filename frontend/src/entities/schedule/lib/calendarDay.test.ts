import { describe, expect, it } from 'vitest';

import {
  calendarDay,
  calendarDayOf,
  formatWeekRange,
  isoWeekDay,
  parseDayMonth,
  weekStart,
} from './calendarDay';

describe('calendarDay', () => {
  it('считает день недели от понедельника', () => {
    // 16 марта 2026 — понедельник, 22 марта — воскресенье.
    expect(isoWeekDay(calendarDay(2026, 3, 16))).toBe(1);
    expect(isoWeekDay(calendarDay(2026, 3, 21))).toBe(6);
    expect(isoWeekDay(calendarDay(2026, 3, 22))).toBe(7);
  });

  it('приводит любой день недели к её понедельнику', () => {
    const monday = calendarDay(2026, 3, 16);
    expect(weekStart(monday)).toBe(monday);
    expect(weekStart(calendarDay(2026, 3, 18))).toBe(monday);
    expect(weekStart(calendarDay(2026, 3, 22))).toBe(monday);
    // Неделя через Новый год: 1 января 2026 — четверг.
    expect(weekStart(calendarDay(2026, 1, 1))).toBe(calendarDay(2025, 12, 29));
  });

  it('берёт сегодняшний день по местному календарю, а не по UTC', () => {
    // 00:30 местного времени: в поясах восточнее UTC это ещё вчера по UTC.
    expect(calendarDayOf(new Date(2026, 2, 16, 0, 30))).toBe(calendarDay(2026, 3, 16));
  });

  it('разбирает ДД.ММ в день указанного года', () => {
    expect(parseDayMonth('16.03', 2026)).toBe(calendarDay(2026, 3, 16));
    expect(parseDayMonth('1.9', 2026)).toBe(calendarDay(2026, 9, 1));
  });

  it('не принимает мусор и несуществующие даты', () => {
    expect(parseDayMonth('', 2026)).toBeNull();
    expect(parseDayMonth('16/03', 2026)).toBeNull();
    expect(parseDayMonth('31.02', 2026)).toBeNull();
    expect(parseDayMonth('29.02', 2026)).toBeNull();
    expect(parseDayMonth('29.02', 2028)).toBe(calendarDay(2028, 2, 29));
  });

  it('подписывает неделю с понедельника по субботу', () => {
    expect(formatWeekRange(calendarDay(2026, 3, 16))).toBe('16–21 марта 2026 г.');
    expect(formatWeekRange(calendarDay(2026, 3, 30))).toBe('30 марта – 4 апреля 2026 г.');
    expect(formatWeekRange(calendarDay(2025, 12, 29))).toBe(
      '29 декабря 2025 г. – 3 января 2026 г.',
    );
  });
});
