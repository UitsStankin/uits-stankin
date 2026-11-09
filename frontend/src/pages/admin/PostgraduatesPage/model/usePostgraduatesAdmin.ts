import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';

import { postgraduatesListQuery } from '@entities/postgraduate';
import { useDeletePostgraduate } from '@features/manage-postgraduates';
import { ADMIN_POSTGRADUATES_ROUTE } from '@shared/config/routes';
import {
  PAGE_PARAM,
  SEARCH_PARAM,
  pageHref,
  parsePage,
  parseSearch,
  useUrlSearch,
} from '@shared/lib';
import type { Postgraduate } from '@shared/types';

/**
 * Раздел аспирантуры: что показано, что нажали. Разметка об этом ничего
 * не знает.
 *
 * **Страница и поиск живут в адресе** — как у остальных списков админки.
 * Что удаляется — в состоянии компонента; правка уходит на свой адрес
 * (разбор у `adminPostgraduateRoute`).
 *
 * Читается **публичная** ручка: модераторского списка записей в контракте
 * нет, а скрытых записей не бывает.
 *
 * ### Сортировки нет, и это решение
 *
 * Контракт её принимает, но любая одноколоночная сортировка здесь листалась
 * бы неустойчиво. Заданный `?sort=` заменяет умолчание Spring целиком,
 * вместе с ключами `student.firstName` и `id`, которые делают порядок
 * однозначным, а ни одна колонка таблицы не уникальна: однофамильцы
 * бывают, год поступления общий у целого набора, руководитель — у пяти
 * аспирантов сразу. Запись с одинаковым ключом приходила бы на двух
 * страницах, а другая — ни на одной. Учётки по той же причине сортируются
 * только по логину и дате (`useUsersAdmin`). Найти нужную запись помогает
 * поиск: он идёт по всем колонкам сразу, включая год и руководителя.
 */
export function usePostgraduatesAdmin() {
  const [searchParams] = useSearchParams();
  const search = useUrlSearch();

  const page = parsePage(searchParams.get(PAGE_PARAM));
  const q = parseSearch(searchParams.get(SEARCH_PARAM));

  // В адресе счёт страниц с единицы, в запросе — с нуля. Пересчёт ровно здесь.
  const query = useQuery(
    postgraduatesListQuery({ page: page - 1, q: q === '' ? undefined : q }),
  );

  const [deleting, setDeleting] = useState<Postgraduate | null>(null);
  const { remove, isPending: isDeleting } = useDeletePostgraduate(() => setDeleting(null));

  const data = query.data;
  const totalPages = data?.totalPages ?? 0;
  const isSearching = q !== '';

  return {
    postgraduates: data ? [...data.content] : [],
    page,
    totalPages,

    searchText: search.text,
    onSearchChange: search.setText,
    onSearchClear: search.clear,
    /** Сколько нашлось — только когда поиск задан и ответ пришёл. */
    foundCount: isSearching && data !== undefined ? data.totalElements : null,

    /** Первая загрузка: показывать скелет. Перелистывание сюда не попадает. */
    isLoading: query.isLoading,
    /** Запрос приостановлен: нет сети либо вкладка в фоне, показать нечего. */
    isOffline: query.isPaused && data === undefined,
    /** На экране прошлая страница, пока едет следующая: таблица притушена. */
    isSwitching: query.isPlaceholderData && query.isFetching,
    isError: query.isError,
    errorMessage: query.error?.message ?? null,
    refetch: () => void query.refetch(),

    /** Записей нет: вовсе либо под этот поиск — различает `isSearching`. */
    isEmpty: query.isSuccess && data !== undefined && data.totalElements === 0,
    isSearching,
    /** Страница за пределами данных: контракт отвечает `200` с пустым `content`. */
    isOutOfRange: query.isSuccess && totalPages > 0 && page > totalPages,

    /** Поиск в адресе страницы сохраняется: перелистывание обязано его помнить. */
    hrefForPage: (target: number) =>
      pageHref(ADMIN_POSTGRADUATES_ROUTE, target, { [SEARCH_PARAM]: isSearching ? q : null }),
    /** Ссылка из пустой выдачи: весь список с первой страницы. */
    resetSearchHref: ADMIN_POSTGRADUATES_ROUTE,

    deleting,
    askDelete: (postgraduate: Postgraduate) => setDeleting(postgraduate),
    cancelDelete: () => setDeleting(null),
    confirmDelete: () => {
      if (deleting) remove(deleting);
    },
    isDeleting,
  };
}
