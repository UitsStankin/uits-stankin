import { http, HttpResponse } from 'msw';

import type { ScheduleLesson, Teacher, TeacherSchedule } from '@shared/types';

import { problemResponse } from './problemResponse';
import { teachersFixture } from './teachers';

const TEACHER_SCHEDULE = '*/api/public/teachers/:id/schedule';

/**
 * Одна пара со всеми полями контракта. Умолчание — лабораторная
 * в понедельник первой парой, каждую неделю всего осеннего семестра.
 */
export function makeLesson(overrides: Partial<ScheduleLesson> = {}): ScheduleLesson {
  return {
    id: 1,
    weekNumber: 1,
    classTime: 1,
    group: 'ИДБ-23-01',
    name: 'Технические средства информационных систем',
    type: 'Лабораторная',
    subgroup: null,
    cabinet: '216',
    dates: [{ id: 1, startDate: '01.09', endDate: '28.12', alternativelyPeriod: false }],
    ...overrides,
  };
}

/**
 * Пары первого преподавателя фикстуры — Абрамова.
 *
 * Периоды покрывают оба семестра целиком, чтобы под `VITE_ENABLE_MOCKS`
 * карточка показывала пары в любую неделю учебного года, а не только
 * в ту, на которую случайно пришлись выдуманные даты. Тесты, которым
 * важна конкретная неделя, задают своё время и свои пары.
 *
 * Названия пар не совпадают с дисциплинами фикстуры карточек
 * (`teachers.ts`): тест карточки ищет дисциплину по тексту, и пара
 * с тем же именем в соседнем блоке сделала бы поиск неоднозначным.
 *
 * Крайние случаи заведены нарочно: подгруппы, лекция потоку (группы через
 * запятую), пара без аудитории, пара через неделю, разовое занятие и пара
 * с двумя периодами — на оба семестра.
 */
const ABRAMOV_LESSONS: readonly ScheduleLesson[] = [
  makeLesson({
    id: 1,
    weekNumber: 1,
    classTime: 1,
    subgroup: 'А',
    dates: [
      { id: 1, startDate: '01.09', endDate: '28.12', alternativelyPeriod: true },
      { id: 2, startDate: '09.02', endDate: '31.05', alternativelyPeriod: true },
    ],
  }),
  makeLesson({
    id: 2,
    weekNumber: 1,
    classTime: 2,
    subgroup: 'Б',
    dates: [
      { id: 3, startDate: '08.09', endDate: '28.12', alternativelyPeriod: true },
      { id: 4, startDate: '16.02', endDate: '31.05', alternativelyPeriod: true },
    ],
  }),
  makeLesson({
    id: 3,
    weekNumber: 2,
    classTime: 3,
    group: 'ИДБ-23-01, ИДБ-23-02, ИДБ-23-03',
    name: 'Архитектура ЭВМ',
    type: 'Лекция',
    cabinet: '0804(КК)',
    dates: [
      { id: 5, startDate: '01.09', endDate: '28.12', alternativelyPeriod: false },
      { id: 6, startDate: '09.02', endDate: '31.05', alternativelyPeriod: false },
    ],
  }),
  makeLesson({
    id: 4,
    weekNumber: 4,
    classTime: 4,
    group: 'ИДМ-25-01',
    name: 'Системы реального времени',
    type: 'Семинар',
    cabinet: null,
    dates: [
      { id: 7, startDate: '01.09', endDate: '28.12', alternativelyPeriod: false },
      { id: 8, startDate: '09.02', endDate: '31.05', alternativelyPeriod: false },
    ],
  }),
  makeLesson({
    id: 5,
    weekNumber: 6,
    classTime: 2,
    group: 'ИДМ-25-01',
    name: 'Системы реального времени',
    type: 'Консультация',
    cabinet: '302',
    dates: [{ id: 9, startDate: '19.12', endDate: null, alternativelyPeriod: false }],
  }),
];

function teacherName(teacher: Teacher): string {
  return [teacher.lastName, teacher.firstName, teacher.patronymic].filter(Boolean).join(' ');
}

/**
 * Расписание пар преподавателя, по контракту:
 *
 * * преподавателя нет — `404`;
 * * расписание не загружено — `200` с пустым `lessons`, не `404`;
 * * `teacherName` собирается из карточки, как на бэкенде.
 *
 * `lessonsByTeacher` — пары по `id` преподавателя. Тест пустого
 * расписания — `server.use(...scheduleHandlers({}))`, своей недели —
 * `scheduleHandlers({ 1: [makeLesson(...)] })`.
 */
export function scheduleHandlers(
  lessonsByTeacher: Readonly<Record<number, readonly ScheduleLesson[]>> = { 1: ABRAMOV_LESSONS },
  teachers: readonly Teacher[] = teachersFixture,
) {
  return [
    http.get(TEACHER_SCHEDULE, ({ params }) => {
      const id = Number(params.id);
      const teacher = teachers.find((item) => item.id === id);
      if (!teacher) {
        return problemResponse(404, {
          title: 'Not Found',
          detail: 'Преподаватель не найден',
          instance: `/api/public/teachers/${String(params.id)}/schedule`,
        });
      }

      const body: TeacherSchedule = {
        teacherId: teacher.id,
        teacherName: teacherName(teacher),
        lessons: lessonsByTeacher[id] ?? [],
      };
      return HttpResponse.json(body);
    }),
  ];
}
