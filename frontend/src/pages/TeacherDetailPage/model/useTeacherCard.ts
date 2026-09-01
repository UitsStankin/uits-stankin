import { useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';

import { teacherQuery } from '@entities/teacher';
import { isApiError } from '@shared/api';
import { parseId } from '@shared/lib';

/**
 * Одна карточка ППС: разбор адреса, запрос, состояния.
 *
 * Подсадки из уже загруженного списка, как у новостей, здесь нет
 * намеренно: списочная ручка отдаёт **короткую** карточку — без контактов,
 * стажей и дисциплин, — и показать её как полную значило бы нарисовать
 * страницу с разделами, которые исчезнут через мгновение. Разбор — в
 * `entities/teacher/api/teacherQueries.ts`; переход из списка честно ждёт
 * свой ответ и показывает скелет.
 */
export function useTeacherCard() {
  const { id: rawId } = useParams<{ id: string }>();
  const id = parseId(rawId);

  const query = useQuery({
    ...teacherQuery(id ?? 0),
    // Битый идентификатор в запрос не уходит: на «abc» бэкенд ответил бы
    // `400`, и человек увидел бы «ошибка сервера» вместо «нет такой
    // страницы». Ключ при этом всё равно нужен — хуки не бывают условными,
    // поэтому `0`, по которому запрос не пойдёт.
    enabled: id !== null,
  });

  const isNotFound = isApiError(query.error) && query.error.status === 404;

  return {
    teacher: query.data ?? null,
    isLoading: id !== null && query.isLoading,
    /**
     * Запрос приостановлен: нет сети либо вкладка в фоне. Ветка отдельная
     * по той же причине, что и в списке: при паузе не выставлены ни
     * `isLoading`, ни `isError`, и без неё страница осталась бы пустой —
     * подробный разбор в `widgets/NewsFeed/model/useNewsList.ts`.
     */
    isOffline: query.isPaused && query.data === undefined,
    /**
     * Карточки нет. У ППС это значит ровно одно: с таким `id` её не
     * существует — скрытых карточек, в отличие от новостей, не бывает.
     *
     * Сюда же попадает нечисловой `id` в адресе: для человека это
     * та же самая несуществующая страница.
     */
    isNotFound: id === null || isNotFound,
    /** Всё остальное: сеть, таймаут, 5xx. */
    isError: query.isError && !isNotFound,
    errorMessage: query.error?.message ?? null,
    refetch: () => void query.refetch(),
  };
}
