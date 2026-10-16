import { queryOptions } from '@tanstack/react-query';

import { fetchUserDirectory } from './userApi';

/**
 * Ключи кэша учётных записей.
 *
 * Пока в кэше лежит один справочник, но ключ заведён иерархией, как
 * у остальных сущностей: с F-46 сюда приедут список учёток и карточка
 * одной, а плоский ключ пришлось бы переписывать вместе со всеми, кто
 * на него ссылается.
 */
export const userKeys = {
  all: ['user'] as const,
  directory: () => [...userKeys.all, 'directory'] as const,
};

/**
 * Описание запроса справочника учёток.
 *
 * `staleTime` — пять минут: справочник меняется тогда, когда заводят
 * нового преподавателя, то есть раз в семестр, а форма карточки ППС
 * открывается подряд по десятку раз. Перезапрашивать его на каждое
 * открытие окна значило бы гонять сотню записей ради данных, которые
 * заведомо те же.
 *
 * `placeholderData` не нужен: страница у справочника одна, листать
 * нечего.
 */
export const userDirectoryQuery = queryOptions({
  queryKey: userKeys.directory(),
  queryFn: ({ signal }) => fetchUserDirectory(signal),
  staleTime: 5 * 60 * 1000,
});
