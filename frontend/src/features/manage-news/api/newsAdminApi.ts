import { api } from '@shared/api';
import type { News, NewsRequest } from '@shared/types';

/**
 * Создание, правка и удаление записи — `POST`, `PUT` и `DELETE /api/news`.
 *
 * Лежит в фиче, а не в сущности: сущность знает только чтение — та же
 * граница, что у дисциплин (`features/manage-subjects`) и карточки ППС
 * (`features/edit-teacher-card`).
 *
 * Путь повторён строкой, а не импортирован из сущности: экспортировать
 * из `entities/news` путь ради одной строки значило бы открыть наружу то,
 * чем сущность пользуется внутри себя. Разъехаться им негде — оба взяты
 * из контракта.
 */
const NEWS_PATH = '/api/news';

/**
 * Ответ — созданная запись с присвоенным `id` (`201`). Заголовок `Location`
 * в ответе тоже есть, но он не нужен: тело уже несёт всё, включая дату
 * и автора, которых форма не отправляла.
 */
export async function createNews(body: NewsRequest): Promise<News> {
  const { data } = await api.post<News>(NEWS_PATH, body);

  return data;
}

/**
 * Правка — **полная замена**: поле, не пришедшее в теле, обнуляется
 * (docs/API.md, «Новости: создание, правка, удаление»). Поэтому форма
 * отправляет все поля, включая незатронутые, а ключ обложки — тот же,
 * что пришёл в ответе, иначе картинка удалилась бы с диска.
 */
export async function updateNews(id: number, body: NewsRequest): Promise<News> {
  const { data } = await api.put<News>(`${NEWS_PATH}/${id}`, body);

  return data;
}

/**
 * Удаление. `204` без тела, запись пропадает физически — отмены
 * в контракте нет. Обложка удаляется вместе с ней, а несуществующая
 * запись даёт `404`.
 */
export async function deleteNews(id: number): Promise<void> {
  await api.delete(`${NEWS_PATH}/${id}`);
}
