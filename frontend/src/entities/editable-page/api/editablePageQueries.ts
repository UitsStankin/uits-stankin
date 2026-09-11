import { keepPreviousData, queryOptions } from '@tanstack/react-query';

import type { EditablePageSlug, PageParams } from '@shared/types';

import { fetchEditablePage, fetchEditablePagesPage } from './editablePageApi';

/**
 * Ключи кэша редактируемых разделов.
 *
 * Иерархия почти плоская: публичная ручка одна и адресуется слагом.
 * Модераторский список (`GET /api/pages`) встал рядом отдельной веткой
 * под тем же `all` — после `PUT` сбрасываются разом и он, и раздел,
 * открытый на сайте, и блоки главной.
 */
export const editablePageKeys = {
  all: ['editable-page'] as const,
  item: (slug: EditablePageSlug) => [...editablePageKeys.all, slug] as const,
  adminList: (params: PageParams) => [...editablePageKeys.all, 'admin-list', params] as const,
};

/**
 * Описание запроса раздела. `queryOptions` связывает ключ с типом ответа —
 * тем же приёмом описаны новости и профиль.
 *
 * Настроек поверх умолчаний `app/providers/queryClient.ts` нет намеренно.
 * Соблазн поднять `staleTime` есть — раздел меняется раз в месяц, — но общих
 * пяти минут для этого более чем достаточно, а всякая цифра сверх умолчания
 * требует объяснения, почему именно она.
 */
export const editablePageQuery = (slug: EditablePageSlug) =>
  queryOptions({
    queryKey: editablePageKeys.item(slug),
    queryFn: ({ signal }) => fetchEditablePage(slug, signal),
  });

/**
 * Описание запроса списка разделов для админки. `keepPreviousData` —
 * как у остальных списков админки: страниц у разделов сегодня одна,
 * но это свойство данных, а не контракта.
 */
export const editablePagesListQuery = (params: PageParams) =>
  queryOptions({
    queryKey: editablePageKeys.adminList(params),
    queryFn: ({ signal }) => fetchEditablePagesPage(params, signal),
    placeholderData: keepPreviousData,
  });
