import { api } from '@shared/api';
import type { PageParams, Teacher, TeacherPage } from '@shared/types';

/**
 * Чтение карточек ППС: две публичные ручки и своя карточка. Сущность знает
 * только чтение — тем же правилом живёт `entities/news`: правка своей
 * карточки лежит в фиче `features/edit-teacher-card`, админский CRUD
 * приедет с блоком 4.
 */

/** Публичные ручки: список коротких карточек и одна полная. */
const PUBLIC_TEACHERS_PATH = '/api/public/teachers';

/**
 * Путь своей карточки. Экспортирован для фичи правки: `GET` и `PUT` ходят
 * на один адрес, и строка, повторённая в двух слайсах, разъедется при
 * первом же переименовании.
 */
export const TEACHERS_ME_PATH = '/api/teachers/me';

/**
 * Своя карточка ППС — полная, с дисциплинами, как публичная детальная.
 *
 * Ручка закрытая: доступна только роли `teacher`, «своя» определяется
 * по токену. У пользователя с ролью, но без привязанной карточки — `404`;
 * это не сбой, а состояние, и страница показывает его отдельным блоком.
 */
export async function fetchMyTeacherCard(signal?: AbortSignal): Promise<Teacher> {
  const { data } = await api.get<Teacher>(TEACHERS_ME_PATH, { signal });
  return data;
}

/**
 * Страница карточек ППС. Формы у ручек разные: здесь короткая карточка —
 * ФИО, должность, степень, звание и адрес фото, — а контакты, стажи
 * и дисциплины приходят только в детальной (docs/API.md, «Преподаватели»).
 *
 * Незаданные поля `params` axios в строку запроса не кладёт, то есть `{}`
 * уходит как `GET /api/public/teachers` и получает умолчания контракта:
 * двадцать карточек, порядок по фамилии и имени.
 *
 * Сортировка своя не передаётся намеренно: алфавит по фамилии — то, что
 * нужно списку сотрудников, и он же стоит на бэкенде по умолчанию. Просить
 * его параметром значило бы дублировать чужое решение, которое при этом
 * может измениться (`sort=user.lastName` уже перестал работать с T-26).
 */
export async function fetchTeachersPage(
  params: PageParams,
  signal?: AbortSignal,
): Promise<TeacherPage> {
  const { data } = await api.get<TeacherPage>(PUBLIC_TEACHERS_PATH, { params, signal });
  return data;
}

/**
 * Полная карточка одного преподавателя — публично, без входа.
 *
 * Ручка открытая, но `404` у неё значит ровно одно: карточки с таким `id`
 * нет. Скрытых карточек у ППС не бывает — в отличие от новостей, где
 * `404` покрывает и снятую с публикации запись.
 */
export async function fetchTeacher(id: number, signal?: AbortSignal): Promise<Teacher> {
  const { data } = await api.get<Teacher>(`${PUBLIC_TEACHERS_PATH}/${id}`, { signal });
  return data;
}
