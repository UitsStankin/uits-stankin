import { useQuery } from '@tanstack/react-query';

import { myTeacherCardQuery } from '@entities/teacher';
import { isApiError } from '@shared/api';

import { useEditToggle } from './useEditToggle';

/**
 * Состояние секции «Информация о преподавателе» в личном кабинете:
 * запрос своей карточки плюс переключатель «смотрю — правлю».
 *
 * Запрос включается флагом `profile.teacher`: без роли ручка ответит
 * `403`, и ходить на неё обычному пользователю незачем. `404` при этом
 * не сбой, а состояние «роль есть, карточка не привязана» — контракт
 * обещает его отдельно, и секция показывает его спокойным блоком,
 * а не красным.
 */
export function useTeacherCardSection(isTeacher: boolean) {
  const query = useQuery({ ...myTeacherCardQuery, enabled: isTeacher });
  const editing = useEditToggle();

  const notFound = isApiError(query.error) && query.error.status === 404;
  /**
   * Запрос **приостановлен**, и показать пока нечего.
   *
   * Считается по `isPaused`, а не по `error.status === 0`, и это не мелочь:
   * при паузе ошибки нет вовсе (`error === null`), а `isLoading` уже снят —
   * то есть по статусу ошибки пауза не ловится ничем. Пока ветка считалась
   * так, преподаватель без сети открывал личный кабинет и не находил в нём
   * своей карточки: не выставлялось ни одно состояние, `card` оставался
   * `null`, и секция возвращала `null` целиком, вместе с объяснением
   * (D-F11). Подробный разбор самой паузы — в
   * `widgets/NewsFeed/model/useNewsList.ts`.
   *
   * Оборванная сеть при живом браузере (`status === 0`) сюда намеренно
   * не попадает: у неё есть текст, и показывает её общая ветка сбоя — ровно
   * так же, как на ленте новостей и на детальной. Два разных состояния
   * с одной подписью разошлись бы по порталу в третий раз.
   */
  const isOffline = query.isPaused && query.data === undefined;
  const failure = query.error !== null && !notFound;

  return {
    card: query.data ?? null,
    isLoading: query.isLoading,
    notFound,
    isOffline,
    isError: failure,
    errorMessage: failure && isApiError(query.error) ? query.error.message : null,
    refetch: () => void query.refetch(),
    ...editing,
  };
}
