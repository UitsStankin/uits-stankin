import { api } from '@shared/api';
import type { TeacherSchedule } from '@shared/types';

/**
 * Расписание пар одного преподавателя — публично, без входа
 * (docs/API.md, «Расписание преподавателя: публичное чтение»).
 *
 * Не загружено — `200` с пустым `lessons`, а не `404`: `404` остаётся
 * только за несуществующим преподавателем. Пары приходят отсортированными
 * по дню недели, номеру пары и `id` — пересортировывать их незачем.
 */
export async function fetchTeacherSchedule(
  teacherId: number,
  signal?: AbortSignal,
): Promise<TeacherSchedule> {
  const { data } = await api.get<TeacherSchedule>(
    `/api/public/teachers/${String(teacherId)}/schedule`,
    { signal },
  );
  return data;
}

/**
 * Сводное расписание пар — по объекту на преподавателя, у кого оно
 * загружено, без архивных карточек, по фамилии (docs/API.md, «Сводное
 * расписание»). Пагинации нет: страница показывает неделю целиком.
 *
 * Фильтр `?teacherId=` контракт умеет, но сюда он не передаётся: выбор
 * преподавателей страница строит из полной выдачи, и, раз она всё равно
 * нужна, отобрать по `id` дешевле на клиенте, чем вторым запросом. В отличие
 * от группы у экзаменов, правило здесь тривиально — равенство `id`, —
 * и второго источника правды оно не заводит.
 */
export async function fetchScheduleSummary(
  signal?: AbortSignal,
): Promise<readonly TeacherSchedule[]> {
  const { data } = await api.get<readonly TeacherSchedule[]>('/api/public/schedule', { signal });
  return data;
}
