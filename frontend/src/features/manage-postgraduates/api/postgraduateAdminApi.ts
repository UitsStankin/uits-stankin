import { api } from '@shared/api';
import type { Postgraduate, PostgraduateRequest } from '@shared/types';

/**
 * Создание, правка и удаление записи аспирантуры — `POST`, `PUT`
 * и `DELETE /api/postgraduates`.
 *
 * Лежит в фиче, а не в сущности: сущность знает только чтение — та же
 * граница, что у УВП и карточек ППС. Чтение одной записи для формы,
 * хоть и закрытое, лежит там же, в `entities/postgraduate`.
 */
const POSTGRADUATES_PATH = '/api/postgraduates';

/**
 * Новая запись — вместе со студентом: отдельной ручки у него нет.
 *
 * Ответ — **в форме элемента публичного списка** (ФИО склеено, группы
 * нет), а не в форме правки (docs/API.md, «Аспирантура»). Форме он нужен
 * только ради подписи в тосте.
 */
export async function createPostgraduate(body: PostgraduateRequest): Promise<Postgraduate> {
  const { data } = await api.post<Postgraduate>(POSTGRADUATES_PATH, body);

  return data;
}

/**
 * Правка — **полная замена**, и студента тоже: поле, не пришедшее в теле,
 * обнуляется. Поэтому форма отправляет все поля, включая те, которых
 * не показывает (`educationLevel`).
 */
export async function updatePostgraduate(
  id: number,
  body: PostgraduateRequest,
): Promise<Postgraduate> {
  const { data } = await api.put<Postgraduate>(`${POSTGRADUATES_PATH}/${id}`, body);

  return data;
}

/**
 * Удаление. `204` без тела. Студент удаляется вместе с записью — его
 * нигде больше нет, и отмены в контракте нет тоже.
 */
export async function deletePostgraduate(id: number): Promise<void> {
  await api.delete(`${POSTGRADUATES_PATH}/${id}`);
}
