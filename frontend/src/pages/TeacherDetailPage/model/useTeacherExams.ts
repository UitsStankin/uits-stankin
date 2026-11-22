import { useQuery } from '@tanstack/react-query';

import {
  type CalendarDay,
  type ExamDay,
  calendarDayOf,
  examDays,
  teacherExamsQuery,
} from '@entities/schedule';
import { isApiError } from '@shared/api';

/** Что блоку экзаменов нужно знать о своём запросе. */
export type TeacherExamsState = {
  days: readonly ExamDay[];
  /** Сегодняшний день — его карточка отмечается, как в расписании пар. */
  today: CalendarDay;
  isOffline: boolean;
  isError: boolean;
  errorMessage: string | null;
  refetch: () => void;
};

/**
 * Разобранные экзамены преподавателя на его карточке — ручка
 * `GET /api/public/teachers/{id}/exams` (F-56).
 *
 * Устроен как соседи — расписание пар и достижения: запрос уходит
 * параллельно с карточкой, битый `id` в запрос не уходит, `404` значит
 * «преподавателя нет», а это уже сказала карточка, — блок молчит.
 *
 * Прошедшие экзамены не отсекаются: ответ — одна сессия, та, что
 * загружена последней, и после неё посетитель ищет как раз её —
 * пересдачу, аудиторию, дату. Следующий импорт заменит её целиком.
 */
export function useTeacherExams(teacherId: number | null): TeacherExamsState {
  const query = useQuery({
    ...teacherExamsQuery(teacherId ?? 0),
    enabled: teacherId !== null,
  });

  const isNotFound = isApiError(query.error) && query.error.status === 404;

  return {
    days: query.data ? examDays([query.data]) : [],
    today: calendarDayOf(new Date()),
    /** Запрос приостановлен: нет сети либо вкладка в фоне, показать нечего. */
    isOffline: query.isPaused && query.data === undefined,
    isError: query.isError && !isNotFound,
    errorMessage: query.error?.message ?? null,
    refetch: () => void query.refetch(),
  };
}
