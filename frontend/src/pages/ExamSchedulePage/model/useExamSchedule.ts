import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';

import {
  type CalendarDay,
  type ExamDay,
  calendarDayOf,
  examDays,
  examFilesQuery,
  examGroups,
  examsSummaryQuery,
} from '@entities/schedule';
import { teacherRoute } from '@shared/config/routes';
import type { ExamScheduleFiles } from '@shared/types';

/** Имя query-параметра с группой — контрактное, как `?q=` у поиска. */
export const GROUP_PARAM = 'group';

/** Ссылка на PDF одного преподавателя в одном из двух списков. */
export type ExamFileLink = {
  teacherId: number;
  teacherName: string;
  href: string;
};

/** Что странице экзаменов нужно знать о своих запросах и адресе. */
export type ExamScheduleState = {
  days: readonly ExamDay[];
  today: CalendarDay;
  /** Выбранная группа; `''` — все. */
  group: string;
  /** Группы для выбора — из полной выдачи, а не из отобранной. */
  groups: readonly string[];
  setGroup: (group: string) => void;
  teacherHref: (teacherId: number) => string;
  isLoading: boolean;
  isOffline: boolean;
  isError: boolean;
  errorMessage: string | null;
  refetch: () => void;
  /** Экзаменов нет вовсе — сессия не загружена ни у кого. */
  isEmpty: boolean;
  /** Экзамены есть, но не у выбранной группы. */
  isGroupEmpty: boolean;
  files: {
    nonGraduation: readonly ExamFileLink[];
    graduation: readonly ExamFileLink[];
    isError: boolean;
    errorMessage: string | null;
    refetch: () => void;
  };
};

/**
 * Сводное расписание экзаменов (F-56): разобранные экзамены всех
 * преподавателей по дням и, ниже, ссылки на PDF из карточек — то,
 * чем страница была в оригинале.
 *
 * **Группа живёт в адресе** (`?group=`), в отличие от недели на карточке
 * преподавателя: «экзамены ИДБ-23-01» — ровно та ссылка, которую староста
 * пересылает группе.
 *
 * **Отбирает бэкенд** — разбор в `entities/schedule/api/examApi.ts`.
 * Список групп для выбора при этом собирается из полной выдачи (`''`),
 * а не из отобранной: в отобранной осталась бы одна выбранная группа
 * и её соседи по потоку. Полная выдача — тот же ключ кэша, что у страницы
 * без отбора, так что посетитель, пришедший со страницы без отбора,
 * второго запроса не ждёт.
 *
 * Группа из адреса, которой нет в списке, в выборе всё равно стоит:
 * иначе он показал бы «Все группы» над пустой выдачей чужой группы.
 */
export function useExamSchedule(): ExamScheduleState {
  const [searchParams, setSearchParams] = useSearchParams();
  // Пробельная группа — не фильтр, по тому же правилу, что пробельный
  // поиск (`parseSearch`): иначе лишний ключ кэша за той же выдачей.
  const group = (searchParams.get(GROUP_PARAM) ?? '').trim();

  const query = useQuery(examsSummaryQuery(group));
  const allQuery = useQuery(examsSummaryQuery(''));
  const filesQuery = useQuery(examFilesQuery());

  const allGroups = examGroups(allQuery.data ?? []);
  const groups =
    group !== '' &&
    !allGroups.some((item) => item.toLocaleLowerCase('ru') === group.toLocaleLowerCase('ru'))
      ? [group, ...allGroups]
      : allGroups;

  const days = examDays(query.data ?? []);
  const isLoaded = query.data !== undefined;

  const files = filesQuery.data ?? [];

  return {
    days,
    today: calendarDayOf(new Date()),
    group,
    groups,
    setGroup: (next) => {
      setSearchParams(next === '' ? {} : { [GROUP_PARAM]: next });
    },
    teacherHref: teacherRoute,
    isLoading: query.isLoading,
    /** Запрос приостановлен: нет сети либо вкладка в фоне, показать нечего. */
    isOffline: query.isPaused && query.data === undefined,
    isError: query.isError,
    errorMessage: query.error?.message ?? null,
    refetch: () => void query.refetch(),
    isEmpty: isLoaded && days.length === 0 && group === '',
    isGroupEmpty: isLoaded && days.length === 0 && group !== '',
    files: {
      nonGraduation: fileLinks(files, 'examScheduleNonGraduation'),
      graduation: fileLinks(files, 'examScheduleGraduation'),
      isError: filesQuery.isError,
      errorMessage: filesQuery.error?.message ?? null,
      refetch: () => void filesQuery.refetch(),
    },
  };
}

/** Преподаватели с заполненной ссылкой нужного вида — в порядке ответа. */
function fileLinks(
  files: readonly ExamScheduleFiles[],
  field: 'examScheduleGraduation' | 'examScheduleNonGraduation',
): ExamFileLink[] {
  return files.flatMap((item) => {
    const href = item[field];
    return href === null
      ? []
      : [{ teacherId: item.teacherId, teacherName: item.teacherName, href }];
  });
}
