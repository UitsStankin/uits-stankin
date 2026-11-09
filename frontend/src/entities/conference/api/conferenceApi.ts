import { api } from '@shared/api';
import type { Conference, ConferencePage, PageParams } from '@shared/types';

/**
 * Публичное чтение объявлений о конференциях — две ручки из семи,
 * что есть у модуля.
 *
 * Тонкий слой поверх axios: адрес, параметры, разворачивание `data`. Разбор
 * ошибок делает интерцептор (`shared/api/client.ts`), кэш и повторы — TanStack
 * Query; здесь нет ни того, ни другого намеренно — тем же правилом живут
 * `entities/news` и остальные сущности.
 *
 * Админские ручки (`/api/conferences`, `POST`, `PUT`, `DELETE`) сюда
 * не попали: их время — блок 4 бэклога (F-45), и лежать они будут в фиче
 * правки, а не здесь. Сущность знает только чтение.
 *
 * Параметры — общий `PageParams` без своего типа: фильтров у списка нет,
 * `postType` из новостей сюда не применим — на него ручка ответила бы `400`.
 */

const PUBLIC_CONFERENCES_PATH = '/api/public/conferences';

/**
 * Страница опубликованных объявлений, новые сверху. Скрытых
 * (`display: false`) здесь не бывает вовсе — их отсекает бэкенд.
 *
 * `signal` приходит от TanStack Query и отменяет запрос, когда он перестал
 * быть нужен: без него быстрое перелистывание оставляло бы в полёте ответы,
 * которые уже некуда девать.
 */
export async function fetchConferencePage(
  params: PageParams,
  signal?: AbortSignal,
): Promise<ConferencePage> {
  const { data } = await api.get<ConferencePage>(PUBLIC_CONFERENCES_PATH, { params, signal });
  return data;
}

/**
 * Одно объявление. Скрытое и несуществующее неразличимы — оба дают `404`,
 * иначе перебором `id` можно было бы пересчитать неопубликованные черновики
 * (docs/API.md, «Конференции»).
 */
export async function fetchConferenceItem(id: number, signal?: AbortSignal): Promise<Conference> {
  const { data } = await api.get<Conference>(`${PUBLIC_CONFERENCES_PATH}/${id}`, { signal });
  return data;
}
