import { queryOptions } from '@tanstack/react-query';

import type { EditablePageSlug } from '@shared/types';

import { fetchEditablePage } from './editablePageApi';

/**
 * Ключи кэша редактируемых разделов.
 *
 * Иерархия плоская, в отличие от `newsKeys`: списков у разделов нет —
 * публичная ручка одна и адресуется слагом. Админский список
 * (`GET /api/pages`) придёт с блоком 4 и встанет рядом отдельной веткой,
 * потому что инвалидировать его после `PUT` нужно вместе с разделом,
 * а не вместо него.
 */
export const editablePageKeys = {
  all: ['editable-page'] as const,
  item: (slug: EditablePageSlug) => [...editablePageKeys.all, slug] as const,
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
