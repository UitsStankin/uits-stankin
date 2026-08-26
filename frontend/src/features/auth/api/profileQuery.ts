import { queryOptions } from '@tanstack/react-query';

import { fetchProfile } from './authApi';

/** Ключи кэша аутентификации. Профиль в приложении один — ключ короткий. */
export const authKeys = {
  profile: ['profile'] as const,
};

/**
 * Описание запроса профиля, вынесенное из хука.
 *
 * `queryOptions` — не украшение: он связывает ключ с типом ответа, и после
 * него `queryClient.setQueryData(profileQuery.queryKey, …)` вне React-дерева
 * типизируется само. Ровно того же описания требуют `useQuery` в `useAuth`
 * и любой будущий prefetch — а два описания одного запроса разъезжаются
 * ровно так же, как две строки с одним путём.
 *
 * `enabled` здесь не задан: он зависит от наличия токена, то есть от
 * состояния, и живёт в `useAuth`. `staleTime` и `retry` тоже не заданы —
 * общие правила стоят в `app/providers/queryClient.ts`, и профилю
 * от них ничего особенного не нужно: 401 не повторяется (4xx),
 * обрыв сети повторяется дважды.
 */
export const profileQuery = queryOptions({
  queryKey: authKeys.profile,
  queryFn: ({ signal }) => fetchProfile(signal),
});
