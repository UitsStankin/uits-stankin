import { keepPreviousData, queryOptions } from '@tanstack/react-query';

import type { PageParams, TeacherAdminListParams } from '@shared/types';

import {
  fetchAdminTeachersPage,
  fetchMyTeacherCard,
  fetchTeacher,
  fetchTeachersPage,
} from './teacherApi';

/**
 * Ключи кэша преподавателей.
 *
 * Иерархия — не украшение: `teacherKeys.all` инвалидирует разом и списки,
 * и открытые карточки, и свою (это понадобится админке после
 * `PUT /api/teachers/{id}`), а `lists()` — только списки, не сбрасывая уже
 * прочитанную карточку. Плоские ключи такого выбора не оставляют.
 *
 * Своя карточка (`me`) стоит рядом со списками намеренно и в `items()`
 * не входит: ключ у неё не `id`, а токен, и по `id` её не найти — карточка
 * приходит с тем же `id`, что и публичная, но лежит на своём ключе,
 * потому что после `PUT` обновлять надо именно её.
 */
export const teacherKeys = {
  all: ['teacher'] as const,
  me: () => [...teacherKeys.all, 'me'] as const,
  lists: () => [...teacherKeys.all, 'list'] as const,
  list: (params: PageParams) => [...teacherKeys.lists(), params] as const,
  /**
   * Защищённый список — под `lists()`, чтобы архивация и правка сбрасывали
   * его тем же движением, что и публичный; `'admin'` отделяет его от
   * публичного с теми же параметрами страницы — ответы у них разные.
   */
  adminList: (params: TeacherAdminListParams) =>
    [...teacherKeys.lists(), 'admin', params] as const,
  items: () => [...teacherKeys.all, 'item'] as const,
  item: (id: number) => [...teacherKeys.items(), id] as const,
};

/**
 * Описание запроса своей карточки. `queryOptions` связывает ключ с типом
 * ответа: `setQueryData` после `PUT` в фиче правки типизируется сам.
 *
 * `enabled` здесь не задан: запрос включает страница по флагу
 * `profile.teacher` — без роли ручка ответила бы `403`, и ходить на неё
 * обычному пользователю незачем.
 */
export const myTeacherCardQuery = queryOptions({
  queryKey: teacherKeys.me(),
  queryFn: ({ signal }) => fetchMyTeacherCard(signal),
});

/**
 * Описание запроса страницы карточек ППС.
 *
 * `keepPreviousData` — как у ленты новостей: без него переход на вторую
 * страницу гасит первую, список схлопывается в скелет и уезжает скролл.
 * С ним прошлая страница остаётся на экране, а `isPlaceholderData`
 * позволяет её на это время притушить.
 */
export const teachersListQuery = (params: PageParams) =>
  queryOptions({
    queryKey: teacherKeys.list(params),
    queryFn: ({ signal }) => fetchTeachersPage(params, signal),
    placeholderData: keepPreviousData,
  });

/**
 * Описание запроса защищённого списка — для админки и выбора
 * преподавателя в формах: только он видит архивные карточки.
 * `keepPreviousData` — по той же причине, что у публичного.
 */
export const adminTeachersListQuery = (params: TeacherAdminListParams) =>
  queryOptions({
    queryKey: teacherKeys.adminList(params),
    queryFn: ({ signal }) => fetchAdminTeachersPage(params, signal),
    placeholderData: keepPreviousData,
  });

/**
 * Описание запроса одной карточки.
 *
 * Подсадки из списка, как у новостей (`findCachedNews`), здесь нет
 * и быть не может: списочная ручка отдаёт **короткую** карточку — без
 * контактов, стажей и дисциплин. Показать её как полную значило бы
 * нарисовать страницу с пустыми разделами, которые через мгновение
 * заполнятся; страница честно ждёт свой ответ и показывает скелет.
 */
export const teacherQuery = (id: number) =>
  queryOptions({
    queryKey: teacherKeys.item(id),
    queryFn: ({ signal }) => fetchTeacher(id, signal),
  });
