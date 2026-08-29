import { useParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { findCachedNews, newsItemQuery } from '@entities/news';
import { isApiError } from '@shared/api';

/**
 * Одна новость: разбор адреса, запрос, подсадка данных из уже загруженного
 * списка.
 *
 * **Спиннера при переходе из ленты быть не должно.** Списочная и детальная
 * ручки отдают один и тот же DTO — `content` записи приезжает уже в списке
 * (`shared/types/news.types.ts`). Значит, у перешедшего по карточке всё
 * нужное лежит в памяти, и `initialData` показывает статью сразу, а Query
 * решает по настоящему возрасту данных, идти ли за свежими. Подробности —
 * в `entities/news/lib/cachedNews.ts`.
 *
 * По прямой ссылке (открыли в новой вкладке, пришли из поиска) кэш пуст,
 * `initialData` не находится, и это обычный запрос со скелетом.
 */
export function useNewsItem() {
  const { id: rawId } = useParams<{ id: string }>();
  const id = parseId(rawId);

  const queryClient = useQueryClient();
  // Ищется на каждом рендере, а не один раз: пока данных на ключе нет,
  // TanStack Query смотрит на `initialData` при каждом обращении, а поиск —
  // это проход по уже лежащим в памяти страницам, без сети и без разбора.
  const cached = id === null ? undefined : findCachedNews(queryClient, id);

  const query = useQuery({
    ...newsItemQuery(id ?? 0),
    // Битый идентификатор в запрос не уходит: `@PathVariable Long` на
    // «abc» ответит `400`, и пользователь увидит «ошибка сервера» там,
    // где на самом деле опечатка в адресе. Ключ при этом всё равно нужен —
    // хуки не бывают условными, поэтому `0`, по которому запрос не пойдёт.
    enabled: id !== null,
    initialData: cached?.news,
    initialDataUpdatedAt: cached?.updatedAt,
  });

  return {
    news: query.data ?? null,
    /** Скелет статьи. При переходе из ленты не показывается — данные уже есть. */
    isLoading: id !== null && query.isLoading,
    /**
     * Запрос приостановлен: нет сети либо вкладка в фоне. Ветка отдельная
     * по той же причине, что и в ленте: при паузе не выставлены ни
     * `isLoading`, ни `isError`, и без неё страница осталась бы пустой —
     * подробный разбор там же, в `useNewsList`.
     */
    isOffline: query.isPaused && query.data === undefined,
    /**
     * Записи нет: либо её никогда не было, либо она скрыта. Различить нельзя
     * и не нужно — контракт отвечает на оба случая `404` намеренно, чтобы
     * перебором `id` нельзя было пересчитать неопубликованные черновики.
     *
     * Сюда же попадает нечисловой `id` в адресе: для пользователя это
     * та же самая несуществующая страница.
     */
    isNotFound: id === null || (isApiError(query.error) && query.error.status === 404),
    /** Всё остальное: сеть, таймаут, 5xx. */
    isError: query.isError && !(isApiError(query.error) && query.error.status === 404),
    errorMessage: query.error?.message ?? null,
    refetch: () => void query.refetch(),
  };
}

/**
 * Идентификатор из адреса. `null` — всё, что не положительное целое:
 * `/about/news/abc`, `/about/news/-1`, `/about/news/1.5`.
 *
 * Экспортируется ради теста — по той же причине, что и `parsePage`
 * в модели ленты.
 */
export function parseId(raw: string | undefined): number | null {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
