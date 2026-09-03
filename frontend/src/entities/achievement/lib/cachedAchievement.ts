import type { QueryClient } from '@tanstack/react-query';

import type { Achievement, AchievementPage } from '@shared/types';

import { achievementKeys } from '../api/achievementQueries';

/** Достижение из кэша списков вместе с моментом, когда список приехал. */
export type CachedAchievement = {
  achievement: Achievement;
  /** `dataUpdatedAt` списка, из которого достижение взято. */
  updatedAt: number;
};

/**
 * Ищет достижение в уже загруженных страницах списков — копия
 * `findCachedNews` при своей сущности, работающая по тем же причинам:
 * списочная и детальная ручки отдают **один и тот же DTO**, то есть
 * `content` достижения приезжает уже в списке, и показывать перешедшему
 * по карточке спиннер — значит выбросить то, за чем только что сходили.
 *
 * Списков здесь два вида — раздел и достижения одного преподавателя, —
 * и оба лежат под общим префиксом `lists()`, поэтому переход с карточки
 * ППС обходится без запроса так же, как переход из раздела
 * (`api/achievementQueries.ts`).
 *
 * Возвращается и `updatedAt`: `initialData` без `initialDataUpdatedAt`
 * считается свежей «прямо сейчас», и открытое через час достижение
 * никогда бы не обновилось. Подробный разбор — в
 * `entities/news/lib/cachedNews.ts`; общего хелпера на три сущности нет
 * по правилу портала — выносим, когда копии множатся, а тут каждая
 * привязана к своим ключам кэша.
 */
export function findCachedAchievement(
  queryClient: QueryClient,
  id: number,
): CachedAchievement | undefined {
  for (const query of queryClient
    .getQueryCache()
    .findAll({ queryKey: achievementKeys.lists() })) {
    const page = query.state.data as AchievementPage | undefined;
    const achievement = page?.content.find((item) => item.id === id);

    if (achievement) return { achievement, updatedAt: query.state.dataUpdatedAt };
  }

  return undefined;
}
