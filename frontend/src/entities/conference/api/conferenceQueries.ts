import { keepPreviousData, queryOptions } from '@tanstack/react-query';

import type { PageParams } from '@shared/types';

import { fetchConferenceItem, fetchConferencePage } from './conferenceApi';

/**
 * Ключи кэша конференций — та же иерархия, что у новостей
 * (`entities/news/api/newsQueries.ts`), и по тем же причинам:
 * `conferenceKeys.all` инвалидирует разом списки и открытые объявления
 * (понадобится админке после `PUT`), `lists()` — только списки,
 * не сбрасывая уже прочитанное объявление.
 */
export const conferenceKeys = {
  all: ['conferences'] as const,
  lists: () => [...conferenceKeys.all, 'list'] as const,
  list: (params: PageParams) => [...conferenceKeys.lists(), params] as const,
  items: () => [...conferenceKeys.all, 'item'] as const,
  item: (id: number) => [...conferenceKeys.items(), id] as const,
};

/**
 * Описание запроса страницы объявлений.
 *
 * `keepPreviousData` — единственная настройка, которой список отличается
 * от умолчаний `app/providers/queryClient.ts`: без него переход на вторую
 * страницу гасит первую, список схлопывается в скелет и уезжает скролл.
 * Разбор — у `newsListQuery`.
 */
export const conferenceListQuery = (params: PageParams) =>
  queryOptions({
    queryKey: conferenceKeys.list(params),
    queryFn: ({ signal }) => fetchConferencePage(params, signal),
    placeholderData: keepPreviousData,
  });

/** Описание запроса одного объявления. */
export const conferenceItemQuery = (id: number) =>
  queryOptions({
    queryKey: conferenceKeys.item(id),
    queryFn: ({ signal }) => fetchConferenceItem(id, signal),
  });
