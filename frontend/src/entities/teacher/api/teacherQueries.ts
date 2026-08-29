import { queryOptions } from '@tanstack/react-query';

import { fetchMyTeacherCard } from './teacherApi';

/**
 * Ключи кэша преподавателей.
 *
 * Иерархия под корнем `teacher` заведена сразу, хотя запись пока одна:
 * F-21 положит рядом `lists()` и `items()` по образцу `newsKeys`,
 * и `teacherKeys.all` будет инвалидировать всё разом — это понадобится
 * админке после `PUT /api/teachers/{id}`.
 */
export const teacherKeys = {
  all: ['teacher'] as const,
  me: () => [...teacherKeys.all, 'me'] as const,
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
