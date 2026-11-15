import { api } from '@shared/api';
import type { ExamScheduleFiles, TeacherExamSchedule } from '@shared/types';

/**
 * Разобранные экзамены одного преподавателя — публично
 * (docs/API.md, «Расписание экзаменов: публичное чтение»).
 *
 * Не загружено — `200` с пустым `exams`; `404` — только за несуществующим
 * преподавателем. Архивная карточка отвечает как обычная: её открывают
 * по прямой ссылке, и экзамены на ней те, что были.
 */
export async function fetchTeacherExams(
  teacherId: number,
  signal?: AbortSignal,
): Promise<TeacherExamSchedule> {
  const { data } = await api.get<TeacherExamSchedule>(
    `/api/public/teachers/${String(teacherId)}/exams`,
    { signal },
  );
  return data;
}

/**
 * Сводное расписание экзаменов — по объекту на преподавателя, у кого они
 * есть, без архивных карточек.
 *
 * Отбор по группе — **серверный**, хотя ответ не постраничный и отобрать
 * можно было бы на клиенте. Причина в правиле сравнения: у экзамена
 * потока в `group` несколько кодов через запятую, и бэкенд сравнивает
 * каждый по отдельности и без регистра. Повторить это на клиенте значило
 * бы завести второй источник правды о том, «чей это экзамен».
 *
 * Пустая группа в запрос не кладётся: `?group=` контракт и так считает
 * отсутствием фильтра, но лишний параметр дал бы ключу кэша второе
 * написание одного и того же запроса.
 */
export async function fetchExamsSummary(
  group: string,
  signal?: AbortSignal,
): Promise<readonly TeacherExamSchedule[]> {
  const { data } = await api.get<readonly TeacherExamSchedule[]>('/api/public/exams', {
    params: group === '' ? undefined : { group },
    signal,
  });
  return data;
}

/**
 * Ссылки на PDF с расписанием экзаменов из карточек ППС — перенос того,
 * чем экзамены были в старом портале. Фильтр `?type=` не передаётся:
 * страница показывает оба вида, и один запрос дешевле двух, которые
 * делал оригинал.
 */
export async function fetchExamFiles(signal?: AbortSignal): Promise<readonly ExamScheduleFiles[]> {
  const { data } = await api.get<readonly ExamScheduleFiles[]>('/api/public/exams/files', {
    signal,
  });
  return data;
}
