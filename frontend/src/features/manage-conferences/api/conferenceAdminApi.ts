import { api } from '@shared/api';
import type { Conference, ConferenceRequest } from '@shared/types';

/**
 * Создание, правка и удаление объявления о конференции — `POST`, `PUT`
 * и `DELETE /api/conferences`.
 *
 * Лежит в фиче, а не в сущности: сущность знает только чтение — та же
 * граница, что у новостей (`features/manage-news`).
 *
 * Путь повторён строкой, а не импортирован из сущности, по той же причине,
 * что у новостей: экспортировать путь ради одной строки значило бы открыть
 * наружу то, чем сущность пользуется внутри себя.
 */
const CONFERENCES_PATH = '/api/conferences';

/**
 * Ответ — созданное объявление с присвоенным `id` (`201`). Заголовок
 * `Location` не нужен: тело уже несёт всё, включая дату создания.
 */
export async function createConference(body: ConferenceRequest): Promise<Conference> {
  const { data } = await api.post<Conference>(CONFERENCES_PATH, body);

  return data;
}

/**
 * Правка — **полная замена**: поле, не пришедшее в теле, обнуляется
 * (docs/API.md, «Конференции»). Поэтому форма отправляет все поля, включая
 * незатронутые, а ключ обложки — тот же, что пришёл в ответе, иначе
 * картинка удалилась бы с диска.
 */
export async function updateConference(id: number, body: ConferenceRequest): Promise<Conference> {
  const { data } = await api.put<Conference>(`${CONFERENCES_PATH}/${id}`, body);

  return data;
}

/**
 * Удаление. `204` без тела, объявление пропадает физически вместе
 * с обложкой — отмены в контракте нет. Несуществующее даёт `404`.
 */
export async function deleteConference(id: number): Promise<void> {
  await api.delete(`${CONFERENCES_PATH}/${id}`);
}
