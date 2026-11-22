import { useQuery } from '@tanstack/react-query';

import { type ScheduleWeekState, teacherScheduleQuery, useScheduleWeek } from '@entities/schedule';
import { isApiError } from '@shared/api';

/** Что блоку расписания нужно знать о своём запросе и неделе. */
export type TeacherScheduleState = {
  week: ScheduleWeekState;
  isOffline: boolean;
  isError: boolean;
  errorMessage: string | null;
  refetch: () => void;
};

/**
 * Расписание пар преподавателя на его карточке — ручка
 * `GET /api/public/teachers/{id}/schedule` (F-55).
 *
 * Живёт при карточке, а не своей страницей: в оригинале это была одна
 * из вкладок карточки, своего адреса у расписания одного преподавателя
 * нет. Запрос уходит параллельно с запросом карточки — по той же
 * причине, что у достижений (`useTeacherAchievements`).
 *
 * Неделя, листание и подсказка под пустой неделей — общие со сводным
 * расписанием (`useScheduleWeek` в `entities/schedule`).
 *
 * **`404`** у этой ручки значит «преподавателя нет», а это уже сказала
 * карточка; блок в этом случае молчит, а не дублирует её сбоем.
 */
export function useTeacherSchedule(teacherId: number | null): TeacherScheduleState {
  const query = useQuery({
    ...teacherScheduleQuery(teacherId ?? 0),
    // Битый `id` в адресе в запрос не уходит — как у достижений.
    enabled: teacherId !== null,
  });

  const week = useScheduleWeek(query.data?.lessons ?? []);
  const isNotFound = isApiError(query.error) && query.error.status === 404;

  return {
    week,
    /** Запрос приостановлен: нет сети либо вкладка в фоне, показать нечего. */
    isOffline: query.isPaused && query.data === undefined,
    isError: query.isError && !isNotFound,
    errorMessage: query.error?.message ?? null,
    refetch: () => void query.refetch(),
  };
}
