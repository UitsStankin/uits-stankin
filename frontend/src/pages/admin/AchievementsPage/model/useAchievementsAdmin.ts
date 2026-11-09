import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import type { SortingState } from '@tanstack/react-table';

import { allAchievementsListQuery } from '@entities/achievement';
import { useDeleteAchievement } from '@features/manage-achievements';
import { ADMIN_ACHIEVEMENTS_ROUTE } from '@shared/config/routes';
import { PAGE_PARAM, SORT_PARAM, pageHref, parsePage, parseSort, sortParam } from '@shared/lib';
import type { Achievement } from '@shared/types';

/**
 * Колонки, по которым список сортируется, — одна дата создания, как
 * у новостей и конференций, и по той же причине: у контракта последним
 * ключом порядка идёт `id`, который одноколоночный `?sort=` не выражает,
 * а у названия совпадения бывают («Победа в олимпиаде» — каждый год).
 */
const SORTABLE_FIELDS = ['createdAt'] as const;

/** Порядок по умолчанию — тот же, что у контракта; разбор у `useNewsAdmin`. */
const DEFAULT_SORTING: SortingState = [{ id: 'createdAt', desc: true }];
const DEFAULT_SORT = sortParam(DEFAULT_SORTING);

/** Что сейчас правится: существующее достижение, новое или ничего. */
type Editing = { achievement: Achievement | null } | null;

/**
 * Раздел достижений: что показано, что открыто и что нажали. Разметка
 * об этом ничего не знает.
 *
 * Устроен как раздел конференций: страница и порядок в адресе, открытое окно
 * в состоянии компонента, чтение — модераторская ручка со скрытыми
 * (`GET /api/achievements`).
 */
export function useAchievementsAdmin() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const page = parsePage(searchParams.get(PAGE_PARAM));
  const sorting = parseSort(searchParams.get(SORT_PARAM), SORTABLE_FIELDS, DEFAULT_SORTING);

  /** Порядок, отличный от умолчания; `null` — не задавать ни в адресе, ни в запросе. */
  const sortInRequest = sortParam(sorting) === DEFAULT_SORT ? null : sortParam(sorting);

  // В адресе счёт страниц с единицы, в запросе — с нуля. Пересчёт ровно здесь.
  const query = useQuery(
    allAchievementsListQuery({ page: page - 1, sort: sortInRequest ?? undefined }),
  );

  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<Achievement | null>(null);

  const { remove, isPending: isDeleting } = useDeleteAchievement(() => setDeleting(null));

  const data = query.data;
  const totalPages = data?.totalPages ?? 0;

  return {
    achievements: data ? [...data.content] : [],
    page,
    totalPages,
    sorting,

    /** Первая загрузка: показывать скелет. Перелистывание сюда не попадает. */
    isLoading: query.isLoading,
    /** Запрос приостановлен: нет сети либо вкладка в фоне, показать нечего. */
    isOffline: query.isPaused && data === undefined,
    /** На экране прошлая страница, пока едет следующая: таблица притушена. */
    isSwitching: query.isPlaceholderData && query.isFetching,
    isError: query.isError,
    errorMessage: query.error?.message ?? null,
    refetch: () => void query.refetch(),

    /** Достижений нет вовсе — не то же самое, что «нет на этой странице». */
    isEmpty: query.isSuccess && data !== undefined && data.totalElements === 0,
    /** Страница за пределами данных: контракт отвечает `200` с пустым `content`. */
    isOutOfRange: query.isSuccess && totalPages > 0 && page > totalPages,

    hrefForPage: (target: number) =>
      pageHref(ADMIN_ACHIEVEMENTS_ROUTE, target, { [SORT_PARAM]: sortInRequest }),

    /** Смена порядка сбрасывает страницу: третья страница прежнего порядка к новому отношения не имеет. */
    onSortingChange: (next: SortingState) => {
      const value = sortParam(next);

      void navigate(
        pageHref(ADMIN_ACHIEVEMENTS_ROUTE, 1, {
          [SORT_PARAM]: value === DEFAULT_SORT ? null : value,
        }),
      );
    },

    editing,
    startCreate: () => setEditing({ achievement: null }),
    startEdit: (achievement: Achievement) => setEditing({ achievement }),
    closeEditor: () => setEditing(null),

    deleting,
    askDelete: (achievement: Achievement) => setDeleting(achievement),
    cancelDelete: () => setDeleting(null),
    confirmDelete: () => {
      if (deleting) remove(deleting);
    },
    isDeleting,
  };
}
