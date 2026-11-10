import { api } from '@shared/api';
import type { PageParams, Teacher, TeacherAdminListParams, TeacherPage } from '@shared/types';

/**
 * Чтение карточек ППС: две публичные ручки и своя карточка. Сущность знает
 * только чтение — тем же правилом живёт `entities/news`: и правка своей
 * карточки, и модераторский CRUD лежат в фиче `features/manage-teachers`.
 *
 * Список у админки свой — защищённый `GET /api/teachers` (с T-102): только
 * он видит архивные карточки. Публичный список их не отдаёт, и раздел,
 * читавший его до F-53, терял заархивированную карточку без возврата.
 * Форма правки по-прежнему догружает полную карточку публичной детальной:
 * по прямой ссылке архивная открывается, а модераторской детальной
 * в контракте нет.
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

/** Защищённый список — модератору и админу, архивные в нём есть. */
const TEACHERS_PATH = '/api/teachers';

/**
 * Страница карточек для админки, включая архивные. Те же короткие
 * карточки, параметры страницы и порядок, что у публичного списка,
 * плюс отбор `archived` (docs/API.md, «Архив»). Незаданный отбор axios
 * в строку запроса не кладёт — тогда приходят все карточки.
 */
export async function fetchAdminTeachersPage(
  params: TeacherAdminListParams,
  signal?: AbortSignal,
): Promise<TeacherPage> {
  const { data } = await api.get<TeacherPage>(TEACHERS_PATH, { params, signal });
  return data;
}

/**
 * Полная карточка одного преподавателя — публично, без входа.
 *
 * Ручка открытая, но `404` у неё значит ровно одно: карточки с таким `id`
 * нет. Архивная карточка по прямой ссылке открывается — с `archived: true`,
 * — в отличие от новостей, где `404` покрывает и снятую с публикации запись.
 */
export async function fetchTeacher(id: number, signal?: AbortSignal): Promise<Teacher> {
  const { data } = await api.get<Teacher>(`${PUBLIC_TEACHERS_PATH}/${id}`, { signal });
  return data;
}
