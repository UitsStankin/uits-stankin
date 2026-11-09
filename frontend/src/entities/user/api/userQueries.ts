import { keepPreviousData, queryOptions } from '@tanstack/react-query';

import type { AdminUserListParams } from '@shared/types';

import { fetchUserDirectory, fetchUsers } from './userApi';

/**
 * Ключи кэша учётных записей.
 *
 * Справочник и админский список — ветки одного корня, и это нужно
 * ровно для инвалидации: снятая роль `teacher` или блокировка убирают
 * учётку из справочника, и сброс `userKeys.all` после правки обновляет
 * оба разом. Форма карточки ППС, открытая после этого, не предложит
 * привязать заблокированного.
 */
export const userKeys = {
  all: ['user'] as const,
  directory: () => [...userKeys.all, 'directory'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (params: AdminUserListParams) => [...userKeys.lists(), params] as const,
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

/**
 * Описание запроса страницы учёток для админки.
 *
 * `keepPreviousData` — как у остальных списков админки: без него смена
 * страницы, отбора или набранный поиск гасили бы таблицу до скелета
 * на каждый запрос.
 */
export const usersListQuery = (params: AdminUserListParams) =>
  queryOptions({
    queryKey: userKeys.list(params),
    queryFn: ({ signal }) => fetchUsers(params, signal),
    placeholderData: keepPreviousData,
  });
