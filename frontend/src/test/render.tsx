import type { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { render } from '@testing-library/react';

/**
 * Клиент запросов для теста: свой на каждый рендер и без повторов.
 *
 * Свой — потому что общий `queryClient` приложения переносил бы кэш
 * из теста в тест: лента, загруженная в первом, показалась бы во втором
 * мгновенно и мимо мока.
 *
 * Без повторов — потому что боевая настройка повторяет 5xx дважды
 * с нарастающей паузой (`app/providers/queryClient.ts`). В тесте на ошибку
 * это несколько секунд ожидания ровно того результата, ради которого тест
 * и написан. Сама политика повторов проверяется отдельно и на своём уровне,
 * а не через страницу.
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

/**
 * Рендер страницы со всем, без чего она не живёт: роутером и клиентом
 * запросов. `route` — адрес, с которого начинается история, вместе
 * с query-параметрами: `?page=2` для ленты — это входные данные, а не клик.
 *
 * `queryClient` передаётся снаружи, когда тесту нужно **положить данные
 * до первого рендера**: страница за `ProtectedRoute` без профиля не рисует
 * ничего, и проверить на ней состояние оборванной сети иначе нельзя —
 * запрос профиля встал бы на ту же паузу. Это не подтасовка, а тот самый
 * случай: профиль лежит в кэше пять минут, а карточка запрашивается заново.
 */
export function renderWithProviders(
  ui: ReactElement,
  {
    route = '/',
    queryClient = createTestQueryClient(),
  }: { route?: string; queryClient?: QueryClient } = {},
) {

  function Providers({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  }

  return { queryClient, ...render(ui, { wrapper: Providers }) };
}
