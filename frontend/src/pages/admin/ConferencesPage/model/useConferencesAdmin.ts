import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import type { SortingState } from '@tanstack/react-table';

import { allConferencesListQuery } from '@entities/conference';
import { useDeleteConference } from '@features/manage-conferences';
import { ADMIN_CONFERENCES_ROUTE } from '@shared/config/routes';
import { PAGE_PARAM, SORT_PARAM, pageHref, parsePage, parseSort, sortParam } from '@shared/lib';
import type { Conference } from '@shared/types';

/**
 * Колонки, по которым список сортируется, — одна дата создания, как
 * у новостей, и по той же причине. Последним ключом порядка у контракта
 * идёт `id` (`@PageableDefault(sort = {"createdAt", "id"})`), а
 * одноколоночный `?sort=` второго ключа не выражает: у даты с микросекундами
 * совпадения исключены, у названия — нет, конференция кафедры каждый год
 * зовётся одинаково.
 *
 * Даты проведения не сортируются тоже, хотя спросить хочется: у половины
 * заготовок их нет вовсе, и где в таком порядке окажутся пустые, решает
 * база, а не контракт.
 */
const SORTABLE_FIELDS = ['createdAt'] as const;

/**
 * Порядок по умолчанию — тот же, что у контракта. Пока порядок совпадает,
 * параметра нет ни в адресе, ни в запросе, и Spring отдаёт своё умолчание
 * вместе с ключом `id` (разбор у `useNewsAdmin`).
 */
const DEFAULT_SORTING: SortingState = [{ id: 'createdAt', desc: true }];
const DEFAULT_SORT = sortParam(DEFAULT_SORTING);

/** Что сейчас правится: существующее объявление, новое или ничего. */
type Editing = { conference: Conference | null } | null;

/**
 * Раздел конференций: что показано, что открыто и что нажали. Разметка
 * об этом ничего не знает.
 *
 * Устроен как раздел новостей без фильтра по типу: страница и порядок
 * живут в адресе, открытое окно — в состоянии компонента. Читается
 * модераторская ручка (`GET /api/conferences`) — в публичной нет черновиков,
 * а видеть их модератор обязан.
 */
export function useConferencesAdmin() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const page = parsePage(searchParams.get(PAGE_PARAM));
  const sorting = parseSort(searchParams.get(SORT_PARAM), SORTABLE_FIELDS, DEFAULT_SORTING);

  /** Порядок, отличный от умолчания; `null` — не задавать ни в адресе, ни в запросе. */
  const sortInRequest = sortParam(sorting) === DEFAULT_SORT ? null : sortParam(sorting);

  // В адресе счёт страниц с единицы, в запросе — с нуля. Пересчёт ровно здесь.
  const query = useQuery(
    allConferencesListQuery({ page: page - 1, sort: sortInRequest ?? undefined }),
  );

  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<Conference | null>(null);

  const { remove, isPending: isDeleting } = useDeleteConference(() => setDeleting(null));

  const data = query.data;
  const totalPages = data?.totalPages ?? 0;

  return {
    conferences: data ? [...data.content] : [],
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

    /** Объявлений нет вовсе — не то же самое, что «нет на этой странице». */
    isEmpty: query.isSuccess && data !== undefined && data.totalElements === 0,
    /** Страница за пределами данных: контракт отвечает `200` с пустым `content`. */
    isOutOfRange: query.isSuccess && totalPages > 0 && page > totalPages,

    hrefForPage: (target: number) =>
      pageHref(ADMIN_CONFERENCES_ROUTE, target, { [SORT_PARAM]: sortInRequest }),

    /** Смена порядка сбрасывает страницу: третья страница прежнего порядка к новому отношения не имеет. */
    onSortingChange: (next: SortingState) => {
      const value = sortParam(next);

      void navigate(
        pageHref(ADMIN_CONFERENCES_ROUTE, 1, {
          [SORT_PARAM]: value === DEFAULT_SORT ? null : value,
        }),
      );
    },

    editing,
    startCreate: () => setEditing({ conference: null }),
    startEdit: (conference: Conference) => setEditing({ conference }),
    closeEditor: () => setEditing(null),

    deleting,
    askDelete: (conference: Conference) => setDeleting(conference),
    cancelDelete: () => setDeleting(null),
    confirmDelete: () => {
      if (deleting) remove(deleting);
    },
    isDeleting,
  };
}
