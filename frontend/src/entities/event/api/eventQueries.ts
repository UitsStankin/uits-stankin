import { queryOptions } from '@tanstack/react-query';

import { fetchAllEvents } from './eventApi';

/**
 * Ключи кэша календаря. Корень один: правка события (F-60) сбросит его
 * целиком — событие меняет и месяц, и список.
 */
export const eventKeys = {
  all: ['event'] as const,
  list: () => [...eventKeys.all, 'list'] as const,
};

/**
 * Все события пользователя. Видимый месяц в ключ не входит: выдача одна
 * на весь календарь (`fetchAllEvents`), и листание запросов не порождает.
 */
export const eventsQuery = () =>
  queryOptions({
    queryKey: eventKeys.list(),
    queryFn: ({ signal }) => fetchAllEvents(signal),
  });
