import { api } from '@shared/api';
import type { Helper, HelperRequest } from '@shared/types';

/**
 * Создание, правка и удаление карточки УВП — `POST`, `PUT`
 * и `DELETE /api/helpers`.
 *
 * Лежит в фиче, а не в сущности: сущность знает только чтение — та же
 * граница, что у новостей, дисциплин и карточек ППС.
 *
 * Путь повторён строкой, а не импортирован из сущности: там лежит
 * публичный `/api/public/helpers`, а это другой адрес — общего у них
 * только слово. Разъехаться им негде, оба взяты из контракта.
 */
const HELPERS_PATH = '/api/helpers';

/**
 * Новая карточка. Ответ — `201` с телом; заголовок `Location` тоже есть,
 * но он не нужен: тело уже несёт всё, включая `id` и собранный адрес фото.
 */
export async function createHelper(body: HelperRequest): Promise<Helper> {
  const { data } = await api.post<Helper>(HELPERS_PATH, body);

  return data;
}

/**
 * Правка — **полная замена**: поле, не пришедшее в теле, обнуляется.
 * Поэтому форма отправляет все поля, а ключ фото — тот же, что пришёл
 * в ответе, иначе фотография удалилась бы с диска.
 */
export async function updateHelper(id: number, body: HelperRequest): Promise<Helper> {
  const { data } = await api.put<Helper>(`${HELPERS_PATH}/${id}`, body);

  return data;
}

/**
 * Удаление. `204` без тела, карточка пропадает физически — отмены
 * в контракте нет. Фото удаляется вместе с ней.
 */
export async function deleteHelper(id: number): Promise<void> {
  await api.delete(`${HELPERS_PATH}/${id}`);
}
