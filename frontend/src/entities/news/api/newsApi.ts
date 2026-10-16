import { api } from '@shared/api';
import type { News, NewsListParams, NewsPage } from '@shared/types';

/**
 * Чтение новостей — три ручки из семи, что есть у модуля.
 *
 * Тонкий слой поверх axios: адрес, параметры, разворачивание `data`. Разбор
 * ошибок делает интерцептор (`shared/api/client.ts`), кэш и повторы — TanStack
 * Query; здесь нет ни того, ни другого намеренно — тем же правилом живёт
 * `features/auth/api/authApi.ts`.
 *
 * **Сущность знает только чтение** — и публичное, и модераторское.
 * `GET /api/news` лежит здесь, а не в фиче админки, по той же границе,
 * по которой словарь дисциплин читается из `entities/subject`, а правится
 * из `features/manage-subjects`: закрытость ручки — это про права, а не
 * про то, что она делает. Создание, правка и удаление ушли в фичу
 * (`features/manage-news`): это действия пользователя, а не предметная
 * область.
 */

const PUBLIC_NEWS_PATH = '/api/public/news';

/** Модераторская половина модуля: то же чтение, но со скрытыми записями. */
const NEWS_PATH = '/api/news';

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

/**
 * Страница **всех** записей, включая скрытые, — `GET /api/news`.
 *
 * Отдельная ручка, а не параметр публичной: посетителю скрытых записей
 * не видно вовсе, и признак «показывать черновики» в открытом списке был бы
 * приглашением их перебрать. Ответ — тот же DTO, поэтому и тип тот же;
 * отличается только выборка и то, что `display` в ней бывает `false`.
 *
 * Параметры те же: страница, размер, порядок и фильтр по типу записи.
 */
export async function fetchAllNewsPage(
  params: NewsListParams,
  signal?: AbortSignal,
): Promise<NewsPage> {
  const { data } = await api.get<NewsPage>(NEWS_PATH, { params, signal });
  return data;
}
