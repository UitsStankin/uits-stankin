import type { QueryClient } from '@tanstack/react-query';

import type { News, NewsPage } from '@shared/types';

import { newsKeys } from '../api/newsQueries';

/** Запись из кэша списков вместе с моментом, когда этот список приехал. */
export type CachedNews = {
  news: News;
  /** `dataUpdatedAt` списка, из которого запись взята. */
  updatedAt: number;
};

/**
 * Ищет запись в уже загруженных страницах списка.
 *
 * Смысл — в устройстве контракта: списочная и детальная ручки отдают **один
 * и тот же DTO**, то есть `content` новости приезжает уже в списке
 * (`shared/types/news.types.ts`). Значит, у перешедшего по карточке
 * пользователя нужная запись целиком лежит в памяти, и показывать ему
 * спиннер — значит выбросить то, за чем только что сходили.
 *
 * Возвращается и `updatedAt`: без него подсадить данные в кэш нельзя честно.
 * `initialData` без `initialDataUpdatedAt` считается свежей «прямо сейчас»,
 * и открытая через час после загрузки списка новость никогда бы не обновилась.
 * С ним TanStack Query видит настоящий возраст данных и сам решает,
 * сходить ли за свежими, — по общему `staleTime` из `queryClient`.
 *
 * Перебор всех страниц, а не только текущей: пользователь мог долистать
 * до пятой, вернуться на вторую и открыть запись оттуда.
 */
export function findCachedNews(queryClient: QueryClient, id: number): CachedNews | undefined {
  for (const query of queryClient.getQueryCache().findAll({ queryKey: newsKeys.lists() })) {
    const page = query.state.data as NewsPage | undefined;
    const news = page?.content.find((item) => item.id === id);

    if (news) return { news, updatedAt: query.state.dataUpdatedAt };
  }

  return undefined;
}
