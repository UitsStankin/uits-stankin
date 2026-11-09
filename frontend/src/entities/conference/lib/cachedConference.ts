import type { QueryClient } from '@tanstack/react-query';

import type { Conference, ConferencePage } from '@shared/types';

import { conferenceKeys } from '../api/conferenceQueries';

/** Объявление из кэша списков вместе с моментом, когда этот список приехал. */
export type CachedConference = {
  conference: Conference;
  /** `dataUpdatedAt` списка, из которого объявление взято. */
  updatedAt: number;
};

/**
 * Ищет объявление в уже загруженных страницах списка — копия `findCachedNews`
 * при своей сущности, работающая по тем же причинам: списочная и детальная
 * ручки отдают **один и тот же DTO**, то есть `content` объявления приезжает
 * уже в списке, и показывать перешедшему по карточке спиннер — значит
 * выбросить то, за чем только что сходили.
 *
 * Возвращается и `updatedAt`: `initialData` без `initialDataUpdatedAt`
 * считается свежей «прямо сейчас», и открытое через час объявление никогда бы
 * не обновилось. Подробный разбор — в `entities/news/lib/cachedNews.ts`;
 * общего хелпера на две сущности нет по правилу портала — выносим, когда
 * копии множатся, а тут их две и обе привязаны к своим ключам кэша.
 */
export function findCachedConference(
  queryClient: QueryClient,
  id: number,
): CachedConference | undefined {
  for (const query of queryClient
    .getQueryCache()
    .findAll({ queryKey: conferenceKeys.lists() })) {
    const page = query.state.data as ConferencePage | undefined;
    const conference = page?.content.find((item) => item.id === id);

    if (conference) return { conference, updatedAt: query.state.dataUpdatedAt };
  }

  return undefined;
}
