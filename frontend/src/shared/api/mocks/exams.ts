import { http, HttpResponse } from 'msw';

import type { Exam, ExamScheduleFiles, Teacher, TeacherExamSchedule } from '@shared/types';

import { problemResponse } from './problemResponse';
import { teachersFixture } from './teachers';

const TEACHER_EXAMS = '*/api/public/teachers/:id/exams';
const EXAMS = '*/api/public/exams';
const EXAM_FILES = '*/api/public/exams/files';

/** Экзамен со всеми полями контракта и консультацией накануне. */
export function makeExam(overrides: Partial<Exam> = {}): Exam {
  return {
    id: 1,
    date: '2027-01-15',
    timeStart: '10:20',
    timeEnd: '15:30',
    group: 'ИДБ-23-01',
    name: 'Технические средства информационных систем',
    cabinet: '216',
    consultation: { date: '2027-01-14', time: '12:20', cabinet: '216' },
    ...overrides,
  };
}

/**
 * Экзамены зимней сессии у трёх первых преподавателей фикстуры.
 *
 * Крайние случаи заведены нарочно: экзамен потока (группы через запятую),
 * два экзамена у разных преподавателей в один день, экзамен без
 * консультации и консультация в другом году, чем экзамен, — 28 декабря
 * к экзамену 11 января.
 */
const EXAMS_BY_TEACHER: Readonly<Record<number, readonly Exam[]>> = {
  1: [
    makeExam({
      id: 1,
      date: '2027-01-11',
      timeStart: '08:30',
      timeEnd: '14:00',
      group: 'ИДБ-23-01, ИДБ-23-02',
      name: 'Архитектура ЭВМ',
      cabinet: '0804(КК)',
      consultation: { date: '2026-12-28', time: '12:20', cabinet: '0804(КК)' },
    }),
    makeExam({ id: 2, date: '2027-01-15' }),
  ],
  2: [
    makeExam({
      id: 3,
      date: '2027-01-15',
      timeStart: '08:30',
      timeEnd: '12:00',
      group: 'ИДМ-25-01',
      name: 'Системы реального времени',
      cabinet: '306(а)',
      consultation: null,
    }),
  ],
  3: [
    makeExam({
      id: 4,
      date: '2027-01-19',
      timeStart: '12:20',
      timeEnd: '17:30',
      group: 'ИДБ-23-02',
      name: 'Базы данных',
      cabinet: '209',
      consultation: { date: '2027-01-18', time: '14:10', cabinet: '209' },
    }),
  ],
};

function teacherName(teacher: Teacher): string {
  return [teacher.lastName, teacher.firstName, teacher.patronymic].filter(Boolean).join(' ');
}

/** Группа экзамена совпадает с фильтром: каждый код отдельно, без регистра. */
function hasGroup(exam: Exam, group: string): boolean {
  const wanted = group.toLocaleLowerCase('ru');
  return exam.group.split(',').some((code) => code.trim().toLocaleLowerCase('ru') === wanted);
}

/**
 * Экзамены по контракту (docs/API.md, «Расписание экзаменов: публичное
 * чтение» и «…ссылки на PDF из карточек ППС»):
 *
 * * у преподавателя: нет такого — `404`, не загружено — пустой `exams`;
 * * сводное: без архивных и без тех, у кого экзаменов нет (в том числе
 *   после отбора по группе), по фамилии; `?group=` сравнивает каждый код
 *   через запятую отдельно и без регистра, пустое значение — не фильтр;
 *   `?teacherId=` повторяемый;
 * * ссылки на PDF: без архивных и без тех, у кого обе ссылки пусты.
 *   Берутся из самих карточек `teachers`, а не из отдельного словаря:
 *   по контракту это те же поля, что в детальной карточке, и мок, где
 *   они расходятся, показывал бы на сводной странице одно, а на карточке
 *   преподавателя — другое.
 *
 * Тест пустой сессии — `server.use(...examHandlers({}))`.
 */
export function examHandlers(
  examsByTeacher: Readonly<Record<number, readonly Exam[]>> = EXAMS_BY_TEACHER,
  teachers: readonly Teacher[] = teachersFixture,
) {
  const byName = [...teachers].sort((a, b) => teacherName(a).localeCompare(teacherName(b), 'ru'));

  return [
    http.get(TEACHER_EXAMS, ({ params }) => {
      const id = Number(params.id);
      const teacher = teachers.find((item) => item.id === id);
      if (!teacher) {
        return problemResponse(404, {
          title: 'Not Found',
          detail: 'Преподаватель не найден',
          instance: `/api/public/teachers/${String(params.id)}/exams`,
        });
      }

      const body: TeacherExamSchedule = {
        teacherId: teacher.id,
        teacherName: teacherName(teacher),
        exams: examsByTeacher[id] ?? [],
      };
      return HttpResponse.json(body);
    }),

    http.get(EXAM_FILES, () => {
      const body: ExamScheduleFiles[] = byName
        .filter(
          (teacher) =>
            !teacher.archived &&
            (teacher.examScheduleGraduation !== null || teacher.examScheduleNonGraduation !== null),
        )
        .map((teacher) => ({
          teacherId: teacher.id,
          teacherName: teacherName(teacher),
          examScheduleGraduation: teacher.examScheduleGraduation,
          examScheduleNonGraduation: teacher.examScheduleNonGraduation,
        }));
      return HttpResponse.json(body);
    }),

    http.get(EXAMS, ({ request }) => {
      const search = new URL(request.url).searchParams;
      const group = (search.get('group') ?? '').trim();
      const teacherIds = search.getAll('teacherId').map(Number);

      const body: TeacherExamSchedule[] = byName
        .filter((teacher) => !teacher.archived)
        .filter((teacher) => teacherIds.length === 0 || teacherIds.includes(teacher.id))
        .map((teacher) => ({
          teacherId: teacher.id,
          teacherName: teacherName(teacher),
          exams: (examsByTeacher[teacher.id] ?? []).filter(
            (exam) => group === '' || hasGroup(exam, group),
          ),
        }))
        .filter((schedule) => schedule.exams.length > 0);
      return HttpResponse.json(body);
    }),
  ];
}
