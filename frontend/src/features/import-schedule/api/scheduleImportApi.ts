import { api } from '@shared/api';
import type { TeacherExamSchedule, TeacherSchedule } from '@shared/types';

/**
 * Импорт PDF расписания — `POST /api/teachers/{id}/schedule/import`
 * и `/exams/import` (docs/API.md, «Импорт расписания преподавателя»).
 * Единственное поле `file`; `Content-Type` ставит axios сам, с граничником
 * из `FormData` (разбор у `uploadFile` в `shared/api/files.ts`).
 *
 * Ответ — расписание после импорта, но в кэш чтения он не кладётся:
 * порядок пар в нём тот, в котором их разобрал микросервис, а не тот,
 * что у ручек чтения, и контракт прямо просит на него не полагаться.
 * Поэтому после импорта кэш сбрасывается, а из ответа берётся только
 * число записей — для слов «загружено 24 занятия».
 */
export async function importTeacherSchedule(
  teacherId: number,
  file: File,
): Promise<TeacherSchedule> {
  const { data } = await api.post<TeacherSchedule>(
    `/api/teachers/${String(teacherId)}/schedule/import`,
    fileBody(file),
  );
  return data;
}

/** Расписание экзаменов — свой PDF и своя ручка, файлы не взаимозаменяемы. */
export async function importTeacherExams(
  teacherId: number,
  file: File,
): Promise<TeacherExamSchedule> {
  const { data } = await api.post<TeacherExamSchedule>(
    `/api/teachers/${String(teacherId)}/exams/import`,
    fileBody(file),
  );
  return data;
}

function fileBody(file: File): FormData {
  const body = new FormData();
  body.append('file', file);
  return body;
}
