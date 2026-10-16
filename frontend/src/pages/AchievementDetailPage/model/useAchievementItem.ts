import { useParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { achievementItemQuery, findCachedAchievement } from '@entities/achievement';
import { isApiError } from '@shared/api';
import { parseId } from '@shared/lib';

/**
 * Одно достижение: разбор адреса, запрос, подсадка данных из уже
 * загруженного списка.
 *
 * **Спиннера при переходе из списка быть не должно.** Списочная и детальная
 * ручки отдают один и тот же DTO — `content` достижения приезжает уже
 * в списке, поэтому `initialData` показывает статью сразу, а Query решает
 * по настоящему возрасту данных, идти ли за свежими. Устройство то же,
 * что у новостей, — подробный разбор в `useNewsItem` и
 * `entities/news/lib/cachedNews.ts`. Списков при этом два вида: переход
 * из блока на карточке ППС тоже обходится без запроса
 * (`entities/achievement/lib/cachedAchievement.ts`).
 *
 * По прямой ссылке кэш пуст, `initialData` не находится, и это обычный
 * запрос со скелетом.
 */
export function useAchievementItem() {
  const { id: rawId } = useParams<{ id: string }>();
  const id = parseId(rawId);

  const queryClient = useQueryClient();
  // Ищется на каждом рендере: пока данных на ключе нет, TanStack Query
  // смотрит на `initialData` при каждом обращении, а поиск — проход
  // по уже лежащим в памяти страницам, без сети.
  const cached = id === null ? undefined : findCachedAchievement(queryClient, id);

  const query = useQuery({
    ...achievementItemQuery(id ?? 0),
    // Битый идентификатор в запрос не уходит: `@PathVariable Long` на «abc»
    // ответил бы `400` — «ошибка сервера» там, где опечатка в адресе.
    // Ключ всё равно нужен — хуки не бывают условными, поэтому `0`,
    // по которому запрос не пойдёт.
    enabled: id !== null,
    initialData: cached?.achievement,
    initialDataUpdatedAt: cached?.updatedAt,
  });

  return {
    achievement: query.data ?? null,
    /** Скелет статьи. При переходе из списка не показывается — данные уже есть. */
    isLoading: id !== null && query.isLoading,
    /** Запрос приостановлен: нет сети либо вкладка в фоне, показать нечего. */
    isOffline: query.isPaused && query.data === undefined,
    /**
     * Достижения нет: либо его никогда не было, либо оно скрыто. Различить
     * нельзя и не нужно — контракт отвечает на оба случая `404` намеренно.
     * Сюда же попадает нечисловой `id` в адресе: для пользователя это
     * та же несуществующая страница.
     */
    isNotFound: id === null || (isApiError(query.error) && query.error.status === 404),
    /** Всё остальное: сеть, таймаут, 5xx. */
    isError: query.isError && !(isApiError(query.error) && query.error.status === 404),
    errorMessage: query.error?.message ?? null,
    refetch: () => void query.refetch(),
  };
}
