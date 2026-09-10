import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import type { SortingState } from '@tanstack/react-table';

import { helpersListQuery } from '@entities/helper';
import { useDeleteHelper } from '@features/manage-helpers';
import { ADMIN_HELPERS_ROUTE } from '@shared/config/routes';
import { PAGE_PARAM, SORT_PARAM, pageHref, parsePage, parseSort, sortParam } from '@shared/lib';
import type { Helper } from '@shared/types';

/**
 * Колонки, по которым список сортируется: фамилия и должность. Имя
 * в списке отдельной колонкой не стоит — оно внутри ФИО, — и сортировать
 * по невидимой колонке незачем.
 */
const SORTABLE_FIELDS = ['lastName', 'position'] as const;

/**
 * Порядок по умолчанию — тот же, что у контракта (`@PageableDefault(sort =
 * {"lastName", "firstName", "id"})`). Совпадение не случайно: пока порядок
 * совпадает, параметра в адресе нет вовсе, запрос уходит без `sort`
 * и получает от Spring его собственное умолчание — вместе с ключами
 * `firstName` и `id`, которых одноколоночный параметр не выражает.
 */
const DEFAULT_SORTING: SortingState = [{ id: 'lastName', desc: false }];
const DEFAULT_SORT = sortParam(DEFAULT_SORTING);

/** Что сейчас правится: существующая карточка, новая или ничего. */
type Editing = { helper: Helper | null } | null;

/**
 * Раздел УВП: что показано, что открыто и что нажали. Разметка об этом
 * ничего не знает.
 *
 * **Страница и порядок живут в адресе**, а не в `useState`: список
 * пересылают ссылкой и возвращаются в него кнопкой «назад».
 *
 * **Что правится — наоборот, в состоянии компонента**, и форма живёт
 * окном, а не своей страницей. Тем УВП и отличается от ППС: карточка
 * целиком помещается в строке списка — вместе с ключом фото, — поэтому
 * догружать нечего, и адрес формы был бы адресом ради адреса.
 *
 * Читается **публичная** ручка: модераторского списка карточек УВП
 * в контракте нет, а скрытых карточек не бывает.
 */
export function useHelpersAdmin() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const page = parsePage(searchParams.get(PAGE_PARAM));
  const sorting = parseSort(searchParams.get(SORT_PARAM), SORTABLE_FIELDS, DEFAULT_SORTING);

  // В адресе счёт страниц с единицы, в запросе — с нуля. Пересчёт ровно здесь.
  const query = useQuery(
    helpersListQuery({ page: page - 1, sort: sortParam(sorting) ?? undefined }),
  );

  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<Helper | null>(null);

  const { remove, isPending: isDeleting } = useDeleteHelper(() => setDeleting(null));

  const data = query.data;
  const totalPages = data?.totalPages ?? 0;

  /** Порядок, отличный от умолчания, — единственное, что попадает в адрес. */
  const sortInUrl = sortParam(sorting) === DEFAULT_SORT ? null : sortParam(sorting);

  return {
    helpers: data ? [...data.content] : [],
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

    /** Карточек нет вовсе — не то же самое, что «нет на этой странице». */
    isEmpty: query.isSuccess && data !== undefined && data.totalElements === 0,
    /** Страница за пределами данных: контракт отвечает `200` с пустым `content`. */
    isOutOfRange: query.isSuccess && totalPages > 0 && page > totalPages,

    hrefForPage: (target: number) =>
      pageHref(ADMIN_HELPERS_ROUTE, target, { [SORT_PARAM]: sortInUrl }),

    /**
     * Смена порядка сбрасывает страницу: третья страница прежнего порядка
     * не имеет отношения к новому, и оставленный номер показал бы карточки,
     * которых человек не искал.
     */
    onSortingChange: (next: SortingState) => {
      const value = sortParam(next);

      void navigate(
        pageHref(ADMIN_HELPERS_ROUTE, 1, { [SORT_PARAM]: value === DEFAULT_SORT ? null : value }),
      );
    },

    editing,
    startCreate: () => setEditing({ helper: null }),
    startEdit: (helper: Helper) => setEditing({ helper }),
    closeEditor: () => setEditing(null),

    deleting,
    askDelete: (helper: Helper) => setDeleting(helper),
    cancelDelete: () => setDeleting(null),
    confirmDelete: () => {
      if (deleting) remove(deleting);
    },
    isDeleting,
  };
}
