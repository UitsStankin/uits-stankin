import { keepPreviousData, queryOptions } from '@tanstack/react-query';

import type { PageParams } from '@shared/types';

import { fetchPostgraduatesPage } from './postgraduateApi';

/**
 * Ключи кэша аспирантуры.
 *
 * Иерархия та же, что у преподавателей и УВП: `all` инвалидирует всё
 * разом — это понадобится админке после `PUT /api/postgraduates/{id}`, —
 * `lists()` — только списки. Ветки `item` нет: единственный потребитель
 * сущности читает список, а ключ, на который никто ничего не кладёт, —
 * не задел, а мёртвая строка.
 */
export const postgraduateKeys = {
  all: ['postgraduate'] as const,
  lists: () => [...postgraduateKeys.all, 'list'] as const,
  list: (params: PageParams) => [...postgraduateKeys.lists(), params] as const,
};

/**
 * Описание запроса страницы записей аспирантуры.
 *
 * `keepPreviousData` — как у всех списков портала: без него переход
 * на вторую страницу гасит первую, таблица схлопывается в скелет
 * и уезжает скролл. С ним прошлая страница остаётся на экране,
 * а `isPlaceholderData` позволяет её на это время притушить.
 */
export const postgraduatesListQuery = (params: PageParams) =>
  queryOptions({
    queryKey: postgraduateKeys.list(params),
    queryFn: ({ signal }) => fetchPostgraduatesPage(params, signal),
    placeholderData: keepPreviousData,
  });
