import { queryOptions } from '@tanstack/react-query';

import { fetchExamFiles, fetchExamsSummary, fetchTeacherExams } from './examApi';
import { fetchScheduleSummary, fetchTeacherSchedule } from './scheduleApi';

/**
 * Ключи кэша расписаний. Пары и экзамены — под общим `all`: импорт PDF
 * в админке сбросит их одним движением.
 */
export const scheduleKeys = {
  all: ['schedule'] as const,
  teachers: () => [...scheduleKeys.all, 'teacher'] as const,
  teacher: (teacherId: number) => [...scheduleKeys.teachers(), teacherId] as const,
  summary: () => [...scheduleKeys.all, 'summary'] as const,
  exams: () => [...scheduleKeys.all, 'exams'] as const,
  teacherExams: (teacherId: number) => [...scheduleKeys.exams(), 'teacher', teacherId] as const,
  examsSummary: (group: string) => [...scheduleKeys.exams(), 'summary', { group }] as const,
  examFiles: () => [...scheduleKeys.exams(), 'files'] as const,
};

/**
 * Расписание одного преподавателя. Неделя, которую смотрит посетитель,
 * в ключ не входит: ответ один на весь семестр, а разворачивание
 * периодов в конкретную неделю — работа клиента (`lib/scheduleWeek.ts`).
 * Листание недель запросов не порождает.
 */
export const teacherScheduleQuery = (teacherId: number) =>
  queryOptions({
    queryKey: scheduleKeys.teacher(teacherId),
    queryFn: ({ signal }) => fetchTeacherSchedule(teacherId, signal),
  });

/**
 * Сводное расписание пар. Отбор по преподавателям в ключ не входит —
 * он клиентский (`fetchScheduleSummary`), и переключение выбора
 * не порождает запросов.
 */
export const scheduleSummaryQuery = () =>
  queryOptions({
    queryKey: scheduleKeys.summary(),
    queryFn: ({ signal }) => fetchScheduleSummary(signal),
  });

/** Разобранные экзамены одного преподавателя — для его карточки. */
export const teacherExamsQuery = (teacherId: number) =>
  queryOptions({
    queryKey: scheduleKeys.teacherExams(teacherId),
    queryFn: ({ signal }) => fetchTeacherExams(teacherId, signal),
  });

/**
 * Сводное расписание экзаменов. `''` — все группы: тот же ключ,
 * из которого страница собирает список групп для выбора.
 */
export const examsSummaryQuery = (group: string) =>
  queryOptions({
    queryKey: scheduleKeys.examsSummary(group),
    queryFn: ({ signal }) => fetchExamsSummary(group, signal),
  });

/** Ссылки на PDF экзаменов из карточек ППС. */
export const examFilesQuery = () =>
  queryOptions({
    queryKey: scheduleKeys.examFiles(),
    queryFn: ({ signal }) => fetchExamFiles(signal),
  });
