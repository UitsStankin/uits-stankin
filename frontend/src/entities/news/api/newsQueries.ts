import { keepPreviousData, queryOptions } from '@tanstack/react-query';

import type { NewsListParams } from '@shared/types';

import { fetchNewsItem, fetchNewsPage } from './newsApi';

/**
 * Ключи кэша новостей.
 *
 * Иерархия — не украшение: `newsKeys.all` инвалидирует разом и списки,
 * и открытые записи (это понадобится админке после `PUT`), а `newsKeys.lists()`
 * — только списки, не сбрасывая уже прочитанную запись. Плоские ключи вида
 * `['news-list', page]` такого выбора не оставляют.
 *
 * Объект параметров внутри ключа безопасен: TanStack Query хеширует ключ
 * структурно и с сортировкой полей, поэтому `{ page: 1 }`, созданный заново
 * при каждом рендере, — это тот же ключ, а не новый запрос.
 *
 * `postType` входит в ключ наравне со страницей, и иначе быть не может:
 * новости, объявления и смешанная лента — три разных ответа сервера,
 * и общий ключ показал бы на странице объявлений то, что осталось от новостей.
 */
export const newsKeys = {
  all: ['news'] as const,
  lists: () => [...newsKeys.all, 'list'] as const,
  list: (params: NewsListParams) => [...newsKeys.lists(), params] as const,
  items: () => [...newsKeys.all, 'item'] as const,
  item: (id: number) => [...newsKeys.items(), id] as const,
};

/**
 * Описание запроса страницы новостей.
 *
 * `queryOptions`, а не голый объект: он связывает ключ с типом ответа,
 * и после него `queryClient.getQueryData(newsListQuery(params).queryKey)`
 * типизируется сам. Тем же приёмом описан профиль в `features/auth`.
 *
 * `keepPreviousData` — единственная настройка, которой список отличается
 * от умолчаний `app/providers/queryClient.ts`. Без него переход на вторую
 * страницу гасит первую: `data` на новом ключе пуста, список схлопывается
 * в спиннер, страница дёргается по высоте и уезжает скролл. С ним прошлая
 * страница остаётся на экране, пока едет следующая, — а `isPlaceholderData`
 * позволяет её на это время притушить.
 */
export const newsListQuery = (params: NewsListParams) =>
  queryOptions({
    queryKey: newsKeys.list(params),
    queryFn: ({ signal }) => fetchNewsPage(params, signal),
    placeholderData: keepPreviousData,
  });

/** Описание запроса одной новости. */
export const newsItemQuery = (id: number) =>
  queryOptions({
    queryKey: newsKeys.item(id),
    queryFn: ({ signal }) => fetchNewsItem(id, signal),
  });
