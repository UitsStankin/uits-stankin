import { http, HttpResponse } from 'msw';

import type { ScheduleLesson, Teacher, TeacherSchedule } from '@shared/types';

import { problemResponse } from './problemResponse';
import { teachersFixture } from './teachers';

const TEACHER_SCHEDULE = '*/api/public/teachers/:id/schedule';
const SCHEDULE_SUMMARY = '*/api/public/schedule';

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

const GROUPS = ['ИДБ-23-01', 'ИДБ-23-02', 'ИДБ-24-01', 'ИДБ-24-03', 'ИДБ-25-11', 'ИДМ-25-01'];
const NAMES = [
  'Базы данных',
  'Операционные системы',
  'Проектирование информационных систем',
  'Компьютерные сети',
  'Программирование на Java',
  'Теория вероятностей и математическая статистика',
  'Методы оптимизации',
];
const TYPES = ['Лекция', 'Семинар', 'Лабораторная'];

/**
 * Пары остальных преподавателей фикстуры — по двенадцать у каждого,
 * детерминированно из номера. Получается около двухсот пятидесяти пар
 * на неделю: сводное расписание (F-57) под `VITE_ENABLE_MOCKS` видно
 * на объёме, близком к кафедре, а не на пяти парах одного Абрамова —
 * на пяти ни вёрстку плотного дня, ни производительность не проверить.
 *
 * Периоды — оба семестра, как у Абрамова. Каждая третья пара — через
 * неделю, каждая пятая — без аудитории, каждая четвёртая — подгруппе.
 */
function generatedLessons(teacherId: number): ScheduleLesson[] {
  return Array.from({ length: 12 }, (_, k) => {
    const id = teacherId * 100 + k;
    const alternativelyPeriod = k % 3 === 0;
    return makeLesson({
      id,
      weekNumber: (((teacherId + k) % 6) + 1) as ScheduleLesson['weekNumber'],
      classTime: (((teacherId * 3 + k * 2) % 6) + 1) as ScheduleLesson['classTime'],
      group: GROUPS[(teacherId + k) % GROUPS.length],
      name: NAMES[(teacherId * 2 + k) % NAMES.length],
      type: TYPES[k % TYPES.length],
      subgroup: k % 4 === 1 ? 'А' : null,
      cabinet: k % 5 === 4 ? null : String(200 + ((teacherId * 7 + k) % 60)),
      dates: [
        { id: id * 2, startDate: '01.09', endDate: '28.12', alternativelyPeriod },
        { id: id * 2 + 1, startDate: '09.02', endDate: '31.05', alternativelyPeriod },
      ],
    });
  });
}

/**
 * Пары по преподавателям для браузера и тестов, которым неважно чьи:
 * Абрамов с крайними случаями и сгенерированные пары у остальных, кроме
 * последних трёх — у них расписание не загружено, и сводная обязана
 * их не показывать.
 */
const LESSONS_BY_TEACHER: Readonly<Record<number, readonly ScheduleLesson[]>> =
  Object.fromEntries(
    teachersFixture
      .slice(0, -3)
      .map((teacher) => [
        teacher.id,
        teacher.id === 1 ? ABRAMOV_LESSONS : generatedLessons(teacher.id),
      ]),
  );

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
 * * сводная (`/api/public/schedule`) — по фамилии, без архивных и без
 *   преподавателей с пустым расписанием, с фильтром `?teacherId=`.
 *
 * `lessonsByTeacher` — пары по `id` преподавателя. Тест пустого
 * расписания — `server.use(...scheduleHandlers({}))`, своей недели —
 * `scheduleHandlers({ 1: [makeLesson(...)] })`.
 */
export function scheduleHandlers(
  lessonsByTeacher: Readonly<Record<number, readonly ScheduleLesson[]>> = LESSONS_BY_TEACHER,
  teachers: readonly Teacher[] = teachersFixture,
) {
  const byName = [...teachers].sort((a, b) => teacherName(a).localeCompare(teacherName(b), 'ru'));

  return [
    // Сводное: по фамилии, без архивных и без тех, у кого пар нет;
    // неизвестный `teacherId` просто не даёт строк — всё по контракту.
    http.get(SCHEDULE_SUMMARY, ({ request }) => {
      const teacherIds = new URL(request.url).searchParams.getAll('teacherId').map(Number);

      const body: TeacherSchedule[] = byName
        .filter((teacher) => !teacher.archived)
        .filter((teacher) => teacherIds.length === 0 || teacherIds.includes(teacher.id))
        .map((teacher) => ({
          teacherId: teacher.id,
          teacherName: teacherName(teacher),
          lessons: lessonsByTeacher[teacher.id] ?? [],
        }))
        .filter((schedule) => schedule.lessons.length > 0);
      return HttpResponse.json(body);
    }),

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
