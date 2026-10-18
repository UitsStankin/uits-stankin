import { http, HttpResponse } from 'msw';

import type { Exam, ScheduleLesson, TeacherExams, TeacherSchedule } from '@shared/types';

const PUBLIC_SCHEDULE = '*/api/public/schedule';
const PUBLIC_EXAMS = '*/api/public/exams';

export function makeLesson(overrides: Partial<ScheduleLesson> = {}): ScheduleLesson {
  return {
    id: 1,
    weekNumber: 1,
    classTime: 2,
    group: 'ИДБ-22-11',
    name: 'Технические средства информационных систем',
    type: 'Лекция',
    subgroup: null,
    cabinet: '216',
    dates: [{ id: 1, startDate: '16.02', endDate: '27.04', alternativelyPeriod: false }],
    ...overrides,
  };
}

export function makeExam(overrides: Partial<Exam> = {}): Exam {
  return {
    id: 1,
    date: '2026-01-14',
    timeStart: '08:30:00',
    timeEnd: '14:00:00',
    group: 'ИДБ-22-11',
    name: 'Системы интеллектуального анализа данных',
    cabinet: '0402',
    consultation: { date: '2026-01-13', time: '14:10:00', cabinet: '0402' },
    ...overrides,
  };
}

/**
 * Два преподавателя, три пары: Чеканин ведёт две (понедельник и среда),
 * Разумовский — одну (понедельник). По фамилии находятся одни пары,
 * по группе ИДБ-22-11 — другие, а группа ИДБ-23-12 есть только у Разумовского.
 */
export const scheduleFixture: readonly TeacherSchedule[] = [
  {
    teacherId: 3,
    teacherName: 'Чеканин Владимир Александрович',
    lessons: [
      makeLesson({ id: 1, weekNumber: 1, classTime: 2 }),
      makeLesson({ id: 2, weekNumber: 3, classTime: 4, name: 'Проектирование АСУ', type: 'Семинар' }),
    ],
  },
  {
    teacherId: 4,
    teacherName: 'Разумовский Андрей Игоревич',
    lessons: [
      makeLesson({
        id: 3,
        weekNumber: 1,
        classTime: 5,
        group: 'ИДБ-23-12',
        name: 'Базы данных',
        type: 'Лабораторная',
        subgroup: 'А',
      }),
    ],
  },
];

export const examsFixture: readonly TeacherExams[] = [
  {
    teacherId: 5,
    teacherName: 'Ибатулин Марат Юрьевич',
    exams: [makeExam({ id: 1 }), makeExam({ id: 2, date: '2026-01-16', consultation: null })],
  },
];

export function scheduleHandlers(
  schedules: readonly TeacherSchedule[] = scheduleFixture,
  exams: readonly TeacherExams[] = examsFixture,
) {
  return [
    http.get(PUBLIC_SCHEDULE, () => HttpResponse.json(schedules)),
    http.get(PUBLIC_EXAMS, () => HttpResponse.json(exams)),
  ];
}
