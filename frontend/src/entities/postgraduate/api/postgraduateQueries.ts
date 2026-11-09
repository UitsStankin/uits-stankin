import { keepPreviousData, queryOptions } from '@tanstack/react-query';

import type { PostgraduateListParams } from '@shared/types';

import { fetchPostgraduate, fetchPostgraduatesPage } from './postgraduateApi';

/**
 * Ключи кэша аспирантуры.
 *
 * Иерархия та же, что у преподавателей и УВП: `all` инвалидирует всё
 * разом — админка сбрасывает его после записи, — `lists()` — только
 * списки, `item(id)` — запись для формы правки (F-47).
 */
export const postgraduateKeys = {
  all: ['postgraduate'] as const,
  lists: () => [...postgraduateKeys.all, 'list'] as const,
  list: (params: PostgraduateListParams) => [...postgraduateKeys.lists(), params] as const,
  item: (id: number) => [...postgraduateKeys.all, 'item', id] as const,
};

/**
 * Описание запроса страницы записей аспирантуры.
 *
 * `keepPreviousData` — как у всех списков портала: без него переход
 * на вторую страницу гасит первую, таблица схлопывается в скелет
 * и уезжает скролл. С ним прошлая страница остаётся на экране,
 * а `isPlaceholderData` позволяет её на это время притушить. С поиском
 * это стало важнее, чем при листании: запрос уходит на каждое изменение
 * поля, и без подстановки прошлого ответа таблица моргала бы скелетом
 * под руками у набирающего.
 */
export const postgraduatesListQuery = (params: PostgraduateListParams) =>
  queryOptions({
    queryKey: postgraduateKeys.list(params),
    queryFn: ({ signal }) => fetchPostgraduatesPage(params, signal),
    placeholderData: keepPreviousData,
  });

/**
 * Запись для формы правки. Без `keepPreviousData`: у формы другой записи
 * нет «прошлой страницы», и подставленная чужая запись была бы враньём.
 */
export const postgraduateQuery = (id: number) =>
  queryOptions({
    queryKey: postgraduateKeys.item(id),
    queryFn: ({ signal }) => fetchPostgraduate(id, signal),
  });
