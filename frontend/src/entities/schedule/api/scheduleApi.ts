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
