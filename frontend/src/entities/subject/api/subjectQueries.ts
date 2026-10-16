import { keepPreviousData, queryOptions } from '@tanstack/react-query';

import type { PageParams } from '@shared/types';

import { fetchSubjectsPage } from './subjectApi';

/**
 * Ключи кэша дисциплин.
 *
 * Иерархия та же, что у остальных сущностей: `all` инвалидирует всё
 * разом — этим пользуются создание, правка и удаление из админки, —
 * `lists()` только списки. Ветка одной дисциплины не заведена: ручки
 * чтения по `id` в контракте нет вовсе, форма правки собирается
 * из строки таблицы, которая уже на экране.
 */
export const subjectKeys = {
  all: ['subject'] as const,
  lists: () => [...subjectKeys.all, 'list'] as const,
  list: (params: PageParams) => [...subjectKeys.lists(), params] as const,
};

/**
 * Описание запроса страницы дисциплин.
 *
 * `keepPreviousData` — как у всех списков портала: без него переход
 * на вторую страницу и смена порядка сортировки гасят таблицу в скелет
 * и уносят скролл.
 */
export const subjectsListQuery = (params: PageParams) =>
  queryOptions({
    queryKey: subjectKeys.list(params),
    queryFn: ({ signal }) => fetchSubjectsPage(params, signal),
    placeholderData: keepPreviousData,
  });
