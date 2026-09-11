import { api } from '@shared/api';
import type { Conference, ConferencePage, PageParams } from '@shared/types';

/**
 * Чтение объявлений о конференциях — публичное и модераторское, три ручки
 * из семи, что есть у модуля.
 *
 * Тонкий слой поверх axios: адрес, параметры, разворачивание `data`. Разбор
 * ошибок делает интерцептор (`shared/api/client.ts`), кэш и повторы — TanStack
 * Query; здесь нет ни того, ни другого намеренно — тем же правилом живут
 * `entities/news` и остальные сущности.
 *
 * **Сущность знает только чтение** — и публичное, и модераторское.
 * `GET /api/conferences` лежит здесь, а не в фиче админки, по той же границе,
 * что у новостей: закрытость ручки — это про права, а не про то, что она
 * делает. Создание, правка и удаление ушли в фичу
 * (`features/manage-conferences`): это действия пользователя, а не предметная
 * область.
 *
 * `GET /api/conferences/{id}` не заведён вовсе: форма берёт объявление
 * из строки таблицы, потому что списочная и детальная ручки отдают один DTO.
 *
 * Параметры — общий `PageParams` без своего типа: фильтров у списка нет,
 * `postType` из новостей сюда не применим — на него ручка ответила бы `400`.
 */

const PUBLIC_CONFERENCES_PATH = '/api/public/conferences';

/** Модераторская половина модуля: то же чтение, но со скрытыми объявлениями. */
const CONFERENCES_PATH = '/api/conferences';

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

/**
 * Страница **всех** объявлений, включая скрытые, — `GET /api/conferences`.
 *
 * Отдельная ручка, а не параметр публичной: посетителю черновиков не видно
 * вовсе, и признак «показывать скрытые» в открытом списке был бы приглашением
 * их перебрать. Ответ — тот же DTO, поэтому и тип тот же; отличается только
 * выборка и то, что `display` в ней бывает `false`.
 */
export async function fetchAllConferencePage(
  params: PageParams,
  signal?: AbortSignal,
): Promise<ConferencePage> {
  const { data } = await api.get<ConferencePage>(CONFERENCES_PATH, { params, signal });
  return data;
}
