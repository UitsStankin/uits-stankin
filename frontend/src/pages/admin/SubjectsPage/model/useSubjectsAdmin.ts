import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import type { SortingState } from '@tanstack/react-table';

import { subjectsListQuery } from '@entities/subject';
import { useDeleteSubject } from '@features/manage-subjects';
import { ADMIN_SUBJECTS_ROUTE } from '@shared/config/routes';
import { PAGE_PARAM, SORT_PARAM, pageHref, parsePage, parseSort, sortParam } from '@shared/lib';
import type { Subject } from '@shared/types';

/**
 * Колонки, по которым контракт умеет сортировать. Описание в этот список
 * не входит: сортировать словарь по тексту описания незачем, а неизвестное
 * поле в `?sort=` — это `400` от Spring.
 */
const SORTABLE_FIELDS = ['name'] as const;

/**
 * Порядок по умолчанию — тот же, что у контракта (`@PageableDefault(sort =
 * "name")`). Совпадение не случайно: пока порядок совпадает, параметра
 * в адресе нет вовсе, и у списка остаётся один канонический адрес.
 */
const DEFAULT_SORTING: SortingState = [{ id: 'name', desc: false }];
const DEFAULT_SORT = sortParam(DEFAULT_SORTING);

/** Что сейчас правится: существующая дисциплина, новая или ничего. */
type Editing = { subject: Subject | null } | null;

/**
 * Раздел дисциплин: что показано, что открыто и что нажали. Разметка
 * об этом ничего не знает.
 *
 * **Страница и порядок живут в адресе**, а не в `useState`. Список
 * пересылают ссылкой и возвращаются в него кнопкой «назад» — по тем же
 * причинам, по которым номер страницы вынесен в адрес у публичных
 * списков (`shared/lib/pageParam.ts`).
 *
 * **Что правится — наоборот, в состоянии компонента.** Открытое окно
 * формы не адрес: перезагрузка страницы с `?edit=3` обязана была бы
 * дождаться списка, найти в нём дисциплину и открыть окно — то есть
 * завести отдельную ручку чтения одной записи, которой в контракте нет.
 */
export function useSubjectsAdmin() {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parsePage(searchParams.get(PAGE_PARAM));
  const sorting = parseSort(searchParams.get(SORT_PARAM), SORTABLE_FIELDS, DEFAULT_SORTING);

  // В адресе счёт страниц с единицы, в запросе — с нуля. Пересчёт ровно здесь.
  const query = useQuery(
    subjectsListQuery({ page: page - 1, sort: sortParam(sorting) ?? undefined }),
  );

  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<Subject | null>(null);

  const { remove, isPending: isDeleting } = useDeleteSubject(() => setDeleting(null));

  const data = query.data;
  const totalPages = data?.totalPages ?? 0;

  /** Порядок, отличный от умолчания, — единственное, что попадает в адрес. */
  const sortInUrl = sortParam(sorting) === DEFAULT_SORT ? null : sortParam(sorting);

  return {
    subjects: data ? [...data.content] : [],
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

    /** Дисциплин нет вовсе — не то же самое, что «нет на этой странице». */
    isEmpty: query.isSuccess && data !== undefined && data.totalElements === 0,
    /** Страница за пределами данных: контракт отвечает `200` с пустым `content`. */
    isOutOfRange: query.isSuccess && totalPages > 0 && page > totalPages,

    hrefForPage: (target: number) =>
      pageHref(ADMIN_SUBJECTS_ROUTE, target, { [SORT_PARAM]: sortInUrl }),

    /**
     * Смена порядка сбрасывает страницу: третья страница прежнего порядка
     * не имеет отношения к новому, и оставленный номер показал бы записи,
     * которых человек не искал.
     */
    onSortingChange: (next: SortingState) => {
      const value = sortParam(next);
      const params = new URLSearchParams(searchParams);

      params.delete(PAGE_PARAM);

      if (value === null || value === DEFAULT_SORT) params.delete(SORT_PARAM);
      else params.set(SORT_PARAM, value);

      setSearchParams(params);
    },

    editing,
    startCreate: () => setEditing({ subject: null }),
    startEdit: (subject: Subject) => setEditing({ subject }),
    closeEditor: () => setEditing(null),

    deleting,
    askDelete: (subject: Subject) => setDeleting(subject),
    cancelDelete: () => setDeleting(null),
    confirmDelete: () => {
      if (deleting) remove(deleting);
    },
    isDeleting,
  };
}
