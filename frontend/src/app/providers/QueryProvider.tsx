import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

/**
 * Единственный экземпляр клиента на всё приложение.
 *
 * Экспортируется наружу намеренно: интерцептору axios он понадобится,
 * чтобы сбрасывать кэш при 401, а мутациям — чтобы инвалидировать запросы
 * вне React-дерева.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // Данные считаются свежими 5 минут
      refetchOnWindowFocus: false, // Не обновлять при фокусе на окне
    },
  },
});

export function QueryProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
