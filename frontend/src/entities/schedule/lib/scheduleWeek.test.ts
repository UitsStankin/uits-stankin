import { describe, expect, it } from 'vitest';

import { makeLesson } from '@shared/api/mocks';

import { calendarDay } from './calendarDay';
import { lessonsOfWeek, lessonWeeks, nearestLessonWeek } from './scheduleWeek';

/** Понедельники весны 2026: 16, 23, 30 марта, 6 апреля. */
const MAR_16 = calendarDay(2026, 3, 16);
const MAR_23 = calendarDay(2026, 3, 23);
const MAR_30 = calendarDay(2026, 3, 30);
const APR_06 = calendarDay(2026, 4, 6);

function idsOn(days: ReturnType<typeof lessonsOfWeek>, weekDay: number): number[] {
  return days.find((day) => day.weekDay === weekDay)?.lessons.map((lesson) => lesson.id) ?? [];
}

describe('lessonsOfWeek', () => {
  it('отдаёт шесть дней с понедельника, пустые тоже', () => {
    const days = lessonsOfWeek([], MAR_16, 2026);

    expect(days.map((day) => day.weekDay)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(days[0].day).toBe(MAR_16);
    expect(days[5].day).toBe(MAR_16 + 5);
    expect(days.every((day) => day.lessons.length === 0)).toBe(true);
  });

  it('ставит пару каждую неделю периода, включая крайние', () => {
    const lesson = makeLesson({
      dates: [{ id: 1, startDate: '16.03', endDate: '30.03', alternativelyPeriod: false }],
    });

    expect(idsOn(lessonsOfWeek([lesson], MAR_16, 2026), 1)).toEqual([1]);
    expect(idsOn(lessonsOfWeek([lesson], MAR_23, 2026), 1)).toEqual([1]);
    expect(idsOn(lessonsOfWeek([lesson], MAR_30, 2026), 1)).toEqual([1]);
    expect(idsOn(lessonsOfWeek([lesson], APR_06, 2026), 1)).toEqual([]);
    expect(idsOn(lessonsOfWeek([lesson], MAR_16 - 7, 2026), 1)).toEqual([]);
  });

  it('пару через неделю ставит с шагом в две недели от первой', () => {
    const lesson = makeLesson({
      dates: [{ id: 1, startDate: '16.03', endDate: '27.04', alternativelyPeriod: true }],
    });

    expect(idsOn(lessonsOfWeek([lesson], MAR_16, 2026), 1)).toEqual([1]);
    expect(idsOn(lessonsOfWeek([lesson], MAR_23, 2026), 1)).toEqual([]);
    expect(idsOn(lessonsOfWeek([lesson], MAR_30, 2026), 1)).toEqual([1]);
  });

  it('разовое занятие ставит только в его неделю', () => {
    const lesson = makeLesson({
      weekNumber: 6,
      dates: [{ id: 1, startDate: '21.03', endDate: null, alternativelyPeriod: false }],
    });

    expect(idsOn(lessonsOfWeek([lesson], MAR_16, 2026), 6)).toEqual([1]);
    expect(idsOn(lessonsOfWeek([lesson], MAR_23, 2026), 6)).toEqual([]);
  });

  /**
   * Подгруппы А и Б чередуются: у одной периоды с 16.03, у другой с 23.03.
   * Так выглядит лабораторная в живом расписании (демо-карточка стенда).
   */
  it('разводит подгруппы, идущие через неделю по очереди', () => {
    const lessons = [
      makeLesson({
        id: 1,
        subgroup: 'Б',
        dates: [{ id: 1, startDate: '16.03', endDate: '27.04', alternativelyPeriod: true }],
      }),
      makeLesson({
        id: 2,
        subgroup: 'А',
        dates: [{ id: 2, startDate: '23.03', endDate: '04.05', alternativelyPeriod: true }],
      }),
    ];

    expect(idsOn(lessonsOfWeek(lessons, MAR_16, 2026), 1)).toEqual([1]);
    expect(idsOn(lessonsOfWeek(lessons, MAR_23, 2026), 1)).toEqual([2]);
    expect(idsOn(lessonsOfWeek(lessons, MAR_30, 2026), 1)).toEqual([1]);
  });

  /**
   * Год угадан неверно — даты съехали по дням недели (16.03.2027 — вторник).
   * Пара остаётся в понедельник, как в бумажном расписании, а не уезжает
   * на день даты.
   */
  it('ставит пару в день из weekNumber, а не в день даты', () => {
    const lesson = makeLesson({
      weekNumber: 1,
      dates: [{ id: 1, startDate: '16.03', endDate: '30.03', alternativelyPeriod: false }],
    });

    const days = lessonsOfWeek([lesson], calendarDay(2027, 3, 15), 2027);
    expect(idsOn(days, 1)).toEqual([1]);
    expect(idsOn(days, 2)).toEqual([]);
  });

  it('держит порядок ответа внутри дня', () => {
    const lessons = [
      makeLesson({ id: 3, classTime: 1 }),
      makeLesson({ id: 1, classTime: 2 }),
      makeLesson({ id: 2, classTime: 2 }),
    ];

    expect(idsOn(lessonsOfWeek(lessons, calendarDay(2026, 9, 7), 2026), 1)).toEqual([3, 1, 2]);
  });

  it('пропускает нечитаемый период, не роняя остальные', () => {
    const lesson = makeLesson({
      dates: [
        { id: 1, startDate: '31.02', endDate: '30.03', alternativelyPeriod: false },
        { id: 2, startDate: '16.03', endDate: null, alternativelyPeriod: false },
      ],
    });

    expect(idsOn(lessonsOfWeek([lesson], MAR_16, 2026), 1)).toEqual([1]);
    expect(idsOn(lessonsOfWeek([lesson], MAR_23, 2026), 1)).toEqual([]);
  });

  it('период, кончающийся раньше начала, переходит через Новый год', () => {
    const lesson = makeLesson({
      dates: [{ id: 1, startDate: '22.12', endDate: '19.01', alternativelyPeriod: false }],
    });

    expect(idsOn(lessonsOfWeek([lesson], calendarDay(2026, 12, 28), 2026), 1)).toEqual([1]);
    expect(idsOn(lessonsOfWeek([lesson], calendarDay(2027, 1, 18), 2026), 1)).toEqual([1]);
    expect(idsOn(lessonsOfWeek([lesson], calendarDay(2027, 1, 25), 2026), 1)).toEqual([]);
  });
});

describe('lessonWeeks и nearestLessonWeek', () => {
  const lessons = [
    makeLesson({
      dates: [{ id: 1, startDate: '16.03', endDate: '13.04', alternativelyPeriod: true }],
    }),
    makeLesson({
      id: 2,
      dates: [{ id: 2, startDate: '16.03', endDate: null, alternativelyPeriod: false }],
    }),
  ];

  it('собирает понедельники недель с парами без повторов', () => {
    expect(lessonWeeks(lessons, 2026)).toEqual([MAR_16, MAR_30, calendarDay(2026, 4, 13)]);
  });

  it('ближайшая — первая не раньше заданной', () => {
    const weeks = lessonWeeks(lessons, 2026);

    expect(nearestLessonWeek(weeks, MAR_23)).toBe(MAR_30);
    expect(nearestLessonWeek(weeks, MAR_23 + 3)).toBe(MAR_30);
    expect(nearestLessonWeek(weeks, calendarDay(2026, 1, 12))).toBe(MAR_16);
  });

  it('после конца семестра ближайшая — последняя', () => {
    const weeks = lessonWeeks(lessons, 2026);

    expect(nearestLessonWeek(weeks, calendarDay(2026, 11, 16))).toBe(calendarDay(2026, 4, 13));
  });

  it('без пар ближайшей нет', () => {
    expect(nearestLessonWeek([], MAR_16)).toBeNull();
  });
});
