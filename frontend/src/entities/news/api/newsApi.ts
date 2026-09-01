import { api } from '@shared/api';
import type { News, NewsListParams, NewsPage } from '@shared/types';

/**
 * Публичное чтение новостей — две ручки из семи, что есть у модуля.
 *
 * Тонкий слой поверх axios: адрес, параметры, разворачивание `data`. Разбор
 * ошибок делает интерцептор (`shared/api/client.ts`), кэш и повторы — TanStack
 * Query; здесь нет ни того, ни другого намеренно — тем же правилом живёт
 * `features/auth/api/authApi.ts`.
 *
 * Админские ручки (`/api/news`, `POST`, `PUT`, `DELETE`) сюда не попали:
 * их время — блок 4 бэклога, а лежать они будут в фиче правки, а не здесь.
 * Сущность знает только чтение.
 */

const PUBLIC_NEWS_PATH = '/api/public/news';

/**
 * Страница опубликованных записей. Скрытых (`display: false`) здесь
 * не бывает вовсе — их отсекает бэкенд.
 *
 * `signal` приходит от TanStack Query и отменяет запрос, когда он перестал
 * быть нужен: без него быстрое перелистывание оставляло бы в полёте ответы,
 * которые уже некуда девать, а последний пришедший мог оказаться не последним
 * запрошенным.
 *
 * Незаданные поля `params` axios в строку запроса не кладёт — то есть
 * `{}` уходит как `GET /api/public/news` и получает умолчания контракта:
 * двадцать записей, новые сверху, оба типа записей разом.
 *
 * `postType` отбирает новости или объявления, и отбирать надо **здесь**,
 * а не после ответа: `totalElements` и `totalPages` считает база по своему
 * запросу, поэтому фильтрация выдачи на клиенте уменьшила бы список
 * на экране, оставив пагинатор обещать страницы, которых нет.
 */
export async function fetchNewsPage(
  params: NewsListParams,
  signal?: AbortSignal,
): Promise<NewsPage> {
  const { data } = await api.get<NewsPage>(PUBLIC_NEWS_PATH, { params, signal });
  return data;
}

/**
 * Одна запись. Скрытая и несуществующая неразличимы — обе дают `404`,
 * иначе перебором `id` можно было бы пересчитать неопубликованные черновики
 * (docs/API.md, «Новости: создание, правка, удаление»).
 */
export async function fetchNewsItem(id: number, signal?: AbortSignal): Promise<News> {
  const { data } = await api.get<News>(`${PUBLIC_NEWS_PATH}/${id}`, { signal });
  return data;
}
