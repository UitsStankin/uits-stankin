import { TEACHERS_ME_PATH } from '@entities/teacher';
import { api } from '@shared/api';
import type { Teacher, TeacherUpsertRequest } from '@shared/types';

/**
 * Правка своей карточки — `PUT /api/teachers/me`.
 *
 * Лежит в фиче, а не в сущности: сущность знает только чтение — то же
 * разделение, что у новостей (`entities/news/api/newsApi.ts`). Путь общий
 * с чтением и потому импортируется оттуда, а не повторяется строкой.
 *
 * Ответ — полная карточка после правки, как у `GET`: вызывающий кладёт её
 * в кэш сущности вместо инвалидации, второй запрос за теми же данными
 * не нужен.
 */
export async function updateMyTeacherCard(body: TeacherUpsertRequest): Promise<Teacher> {
  const { data } = await api.put<Teacher>(TEACHERS_ME_PATH, body);
  return data;
}
