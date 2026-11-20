import { http, HttpResponse } from 'msw';
import type { Gradesheet } from '@entities/gradesheet';
import { multipartField } from './files';
import { pageFromUrl } from './page';
import { problemResponse } from './problemResponse';

const endpoint = '*/api/gradesheets';

export function makeGradesheet(overrides: Partial<Gradesheet> = {}): Gradesheet {
  return {
    id: 1,
    discipline: 'Базы данных',
    group: 'ИДБ-25-11',
    semester: 'Осенний семестр 2026/2027 учебного года',
    department: 'УИТС',
    direction: 'Прикладная информатика',
    teachers: 'Петров П.П.',
    importedFileName: 'ведомости.xlsx',
    blocks: ['М1', 'М2', 'Зачёт'],
    students: [
      {
        id: 1, number: 1, lastName: 'Иванов', firstName: 'Иван', patronymic: null,
        marks: [
          { id: 1, block: 'М1', score: 0, text: null, grade: null, date: null, teacher: null },
          { id: 2, block: 'Зачёт', score: null, text: 'не допущен', grade: null, date: null, teacher: null },
        ],
      },
    ],
    ...overrides,
  };
}

export function gradesheetHandlers(initial = [makeGradesheet()]) {
  const sheets = new Map(initial.map((sheet) => [sheet.id, sheet]));
  let nextId = Math.max(0, ...sheets.keys()) + 1;

  return [
    http.get(endpoint, ({ request }) => {
      const url = new URL(request.url);
      const discipline = url.searchParams.get('discipline')?.toLowerCase() ?? '';
      const group = url.searchParams.get('group')?.toLowerCase();
      const semester = url.searchParams.get('semester');
      const matching = [...sheets.values()].reverse().filter((sheet) =>
        sheet.discipline.toLowerCase().includes(discipline) &&
        (!group || sheet.group.toLowerCase() === group) &&
        (!semester || sheet.semester === semester),
      );
      const summaries = matching.map((sheet) => ({
        id: sheet.id, discipline: sheet.discipline, group: sheet.group, semester: sheet.semester,
        department: sheet.department, direction: sheet.direction, teachers: sheet.teachers,
        importedFileName: sheet.importedFileName, studentCount: sheet.students.length,
      }));
      return HttpResponse.json(pageFromUrl(summaries, url));
    }),
    http.get(`${endpoint}/:id`, ({ params, request }) => {
      const sheet = sheets.get(Number(params.id));
      return sheet ? HttpResponse.json(sheet) : missing(request);
    }),
    http.post(`${endpoint}/import`, async ({ request }) => {
      if (multipartField(await request.text(), 'file') === null) {
        return problemResponse(400, {
          title: 'Bad Request', detail: 'Файл ведомости не выбран.', instance: '/api/gradesheets/import',
        });
      }

      // На моках книга заменяется двумя вымышленными листами. Их состав не зависит от файла.
      return HttpResponse.json({
        sheets: ['ИДБ-25-11', 'ИДБ-25-15'].map((group) => {
          const { discipline, semester, students } = makeGradesheet();
          const existing = [...sheets.values()].find((sheet) =>
            sheet.group === group && sheet.discipline === discipline && sheet.semester === semester);
          const id = existing?.id ?? nextId++;
          sheets.set(id, makeGradesheet({ id, group }));
          return {
            id, sheetName: group, discipline, group, semester, studentCount: students.length,
            teacherId: null, subjectId: null,
            warnings: group === 'ИДБ-25-15' ? ['Преподаватель не найден в справочнике ППС.'] : [],
          };
        }),
      });
    }),
    http.delete(`${endpoint}/:id`, ({ params, request }) =>
      sheets.delete(Number(params.id)) ? new HttpResponse(null, { status: 204 }) : missing(request)),
  ];
}

function missing(request: Request) {
  return problemResponse(404, {
    title: 'Not Found', detail: 'Ведомость не найдена.', instance: new URL(request.url).pathname,
  });
}
