import { api } from '@shared/api';
import type { Subject, SubjectRequest } from '@shared/types';

/**
 * Создание, правка и удаление дисциплины — `POST`, `PUT` и `DELETE
 * /api/subjects`.
 *
 * Лежит в фиче, а не в сущности: сущность знает только чтение — то же
 * разделение, что у карточки ППС (`features/manage-teachers`).
 *
 * Путь тот же, что у чтения, но повторён строкой, а не импортирован
 * из сущности: экспортировать из `entities/subject` путь ради одной
 * строки значило бы открыть наружу то, чем сущность и так пользуется
 * внутри себя. Разъехаться им негде — оба взяты из контракта.
 */
const SUBJECTS_PATH = '/api/subjects';

/**
 * Ответ — созданная дисциплина с присвоенным `id` (`201`). Заголовок
 * `Location` в ответе тоже есть, но он не нужен: тело уже несёт всё,
 * а страницы одной дисциплины у нас нет.
 */
export async function createSubject(body: SubjectRequest): Promise<Subject> {
  const { data } = await api.post<Subject>(SUBJECTS_PATH, body);

  return data;
}

/** Правка — полная замена: тело без описания его очищает. */
export async function updateSubject(id: number, body: SubjectRequest): Promise<Subject> {
  const { data } = await api.put<Subject>(`${SUBJECTS_PATH}/${id}`, body);

  return data;
}

/**
 * Удаление. `204` без тела — и только если дисциплина никому
 * не назначена: иначе `409`, и в `detail` сказано, скольким карточкам
 * ППС она назначена (docs/API.md).
 */
export async function deleteSubject(id: number): Promise<void> {
  await api.delete(`${SUBJECTS_PATH}/${id}`);
}
