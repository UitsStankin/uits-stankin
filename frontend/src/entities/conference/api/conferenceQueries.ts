import { keepPreviousData, queryOptions } from '@tanstack/react-query';

import type { PageParams } from '@shared/types';

import { fetchAllConferencePage, fetchConferenceItem, fetchConferencePage } from './conferenceApi';

/**
 * Ключи кэша конференций — та же иерархия, что у новостей
 * (`entities/news/api/newsQueries.ts`), и по тем же причинам:
 * `conferenceKeys.all` инвалидирует разом списки и открытые объявления
 * (так и делает админка после `POST`, `PUT` и `DELETE`), `lists()` — только
 * публичные списки, не сбрасывая уже прочитанное объявление.
 */
export const conferenceKeys = {
  all: ['conferences'] as const,
  lists: () => [...conferenceKeys.all, 'list'] as const,
  list: (params: PageParams) => [...conferenceKeys.lists(), params] as const,
  /**
   * Модераторские списки — своя ветка, а не те же `lists()` с другим
   * параметром, и причина та же, что у новостей. `findCachedConference`
   * подсаживает объявление из **любого** списка под `lists()` в детальную
   * страницу через `initialData`: окажись админская выдача под тем же
   * префиксом, черновик, увиденный модератором в админке, открылся бы у него
   * по публичному адресу — там, где контракт отвечает `404`.
   */
  adminLists: () => [...conferenceKeys.all, 'admin-list'] as const,
  adminList: (params: PageParams) => [...conferenceKeys.adminLists(), params] as const,
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

/**
 * Описание запроса страницы **всех** объявлений, включая скрытые, — для
 * раздела админки.
 *
 * `keepPreviousData` — по той же причине, что у публичного списка:
 * без него перелистывание гасит таблицу и страница дёргается по высоте.
 */
export const allConferencesListQuery = (params: PageParams) =>
  queryOptions({
    queryKey: conferenceKeys.adminList(params),
    queryFn: ({ signal }) => fetchAllConferencePage(params, signal),
    placeholderData: keepPreviousData,
  });
