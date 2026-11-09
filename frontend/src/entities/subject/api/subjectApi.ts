import { api } from '@shared/api';
import type { PageParams, SubjectPage } from '@shared/types';

/**
 * Словарь дисциплин. Ручка **не публичная**: `GET /api/subjects` открыт
 * админу и модератору (docs/API.md, «Эндпоинты»), поэтому и префикса
 * `public` в пути нет.
 *
 * Тем и отличается от остальных сущностей портала: у новостей, ППС, УВП
 * и аспирантов сущность читает публичную ручку, а закрытую — фича правки.
 * Здесь публичной ручки не существует вовсе: дисциплины видны посетителю
 * только внутри карточки преподавателя, своего раздела у них нет.
 */
const SUBJECTS_PATH = '/api/subjects';

/**
 * Страница дисциплин: название и описание.
 *
 * `sort` уезжает как есть — `'name,asc'`: контракт принимает поле
 * и направление одной строкой (docs/API.md, «Пагинация списков»).
 * Незаданные поля `params` axios в строку запроса не кладёт, то есть
 * `{}` уходит как `GET /api/subjects` и получает умолчания контракта:
 * двадцать записей по алфавиту названий.
 */
export async function fetchSubjectsPage(
  params: PageParams,
  signal?: AbortSignal,
): Promise<SubjectPage> {
  const { data } = await api.get<SubjectPage>(SUBJECTS_PATH, { params, signal });

  return data;
}
