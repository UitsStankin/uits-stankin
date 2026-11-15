import { queryOptions } from '@tanstack/react-query';

import { fetchTeacherSchedule } from './scheduleApi';

/**
 * Ключи кэша расписаний. Под общим `all` встанут и сводное расписание,
 * и экзамены: импорт PDF в админке сбросит их одним движением.
 */
export const scheduleKeys = {
  all: ['schedule'] as const,
  teachers: () => [...scheduleKeys.all, 'teacher'] as const,
  teacher: (teacherId: number) => [...scheduleKeys.teachers(), teacherId] as const,
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
