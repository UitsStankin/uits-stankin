import { keepPreviousData, queryOptions } from '@tanstack/react-query';

import type { PageParams } from '@shared/types';

import { fetchHelpersPage } from './helperApi';

/**
 * Ключи кэша УВП.
 *
 * Иерархия та же, что у преподавателей: `all` инвалидирует всё разом —
 * это понадобится админке после `PUT /api/helpers/{id}`, — `lists()` —
 * только списки. Ветки `item` нет: единственный потребитель сущности
 * читает список, а ключ, на который никто ничего не кладёт, — не задел,
 * а мёртвая строка.
 */
export const helperKeys = {
  all: ['helper'] as const,
  lists: () => [...helperKeys.all, 'list'] as const,
  list: (params: PageParams) => [...helperKeys.lists(), params] as const,
};

/**
 * Описание запроса страницы карточек УВП.
 *
 * `keepPreviousData` — как у всех списков портала: без него переход
 * на вторую страницу гасит первую, список схлопывается в скелет и уезжает
 * скролл. С ним прошлая страница остаётся на экране, а
 * `isPlaceholderData` позволяет её на это время притушить.
 */
export const helpersListQuery = (params: PageParams) =>
  queryOptions({
    queryKey: helperKeys.list(params),
    queryFn: ({ signal }) => fetchHelpersPage(params, signal),
    placeholderData: keepPreviousData,
  });
