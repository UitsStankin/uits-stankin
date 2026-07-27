import { QueryClient } from '@tanstack/react-query';

/**
 * Единственный экземпляр клиента на всё приложение.
 *
 * Живёт в отдельном файле, а не рядом с QueryProvider: правило
 * react-refresh/only-export-components требует, чтобы модуль экспортировал
 * либо только компоненты, либо только обычные значения — иначе ломается
 * Fast Refresh.
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
