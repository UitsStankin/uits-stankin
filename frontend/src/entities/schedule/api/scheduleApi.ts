import { api } from '@shared/api';
import type { TeacherExams, TeacherSchedule } from '@shared/types';

const PUBLIC_SCHEDULE_PATH = '/api/public/schedule';
const PUBLIC_EXAMS_PATH = '/api/public/exams';

/**
 * Сводное расписание пар: массив, по объекту на каждого преподавателя,
 * у кого оно загружено. Страниц у ручки нет — сетка показывает неделю целиком.
 */
export async function fetchScheduleSummary(signal?: AbortSignal): Promise<TeacherSchedule[]> {
  const { data } = await api.get<TeacherSchedule[]>(PUBLIC_SCHEDULE_PATH, { signal });
  return data;
}

/** Сводное расписание экзаменов; преподаватели без экзаменов в выдачу не попадают. */
export async function fetchExamSummary(signal?: AbortSignal): Promise<TeacherExams[]> {
  const { data } = await api.get<TeacherExams[]>(PUBLIC_EXAMS_PATH, { signal });
  return data;
}
