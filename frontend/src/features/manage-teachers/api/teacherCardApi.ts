import { TEACHERS_ME_PATH } from '@entities/teacher';
import { api } from '@shared/api';
import type { Teacher, TeacherAdminRequest, TeacherUpsertRequest } from '@shared/types';

/**
 * Запись карточек ППС: своя (`PUT /api/teachers/me`) и любая
 * (`POST`/`PUT`/`DELETE /api/teachers`).
 *
 * Лежит в фиче, а не в сущности: сущность знает только чтение — то же
 * разделение, что у новостей (`entities/news/api/newsApi.ts`).
 *
 * Ответ у всех трёх пишущих ручек — полная карточка, как у `GET`:
 * с присвоенным `id`, собранным `avatarUrl` и развёрнутыми дисциплинами.
 * Вызывающий кладёт её в кэш, второй запрос за теми же данными не нужен.
 */

/** Путь модераторских ручек. `public` в нём нет: они закрыты ролью. */
const TEACHERS_PATH = '/api/teachers';

/**
 * Правка своей карточки. Путь общий с чтением и потому импортируется
 * из сущности, а не повторяется строкой.
 */
export async function updateMyTeacherCard(body: TeacherUpsertRequest): Promise<Teacher> {
  const { data } = await api.put<Teacher>(TEACHERS_ME_PATH, body);
  return data;
}

/**
 * Новая карточка. Ответ — `201` с телом; заголовок `Location` тоже есть,
 * но он не нужен: тело уже несёт всё, включая `id`.
 */
export async function createTeacher(body: TeacherAdminRequest): Promise<Teacher> {
  const { data } = await api.post<Teacher>(TEACHERS_PATH, body);
  return data;
}

/**
 * Правка любой карточки — **полная замена**, как и у своей: поле,
 * не пришедшее в теле, обнуляется. Поэтому форма отправляет все поля,
 * включая незатронутые, — ключ фото, связь с учёткой и список дисциплин
 * в том числе.
 */
export async function updateTeacher(id: number, body: TeacherAdminRequest): Promise<Teacher> {
  const { data } = await api.put<Teacher>(`${TEACHERS_PATH}/${id}`, body);
  return data;
}

/**
 * Удаление карточки. `204` без тела, карточка пропадает физически —
 * отмены в контракте нет. Привязанная учётная запись при этом
 * не удаляется и работать не перестаёт: удаляется карточка, а не человек.
 */
export async function deleteTeacher(id: number): Promise<void> {
  await api.delete(`${TEACHERS_PATH}/${id}`);
}
