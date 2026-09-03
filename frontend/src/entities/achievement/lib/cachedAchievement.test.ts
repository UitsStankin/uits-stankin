import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it } from 'vitest';

import { makeAchievement } from '@shared/api/mocks';
import type { AchievementPage } from '@shared/types';

import {
  achievementItemQuery,
  achievementListQuery,
  teacherAchievementsQuery,
} from '../api/achievementQueries';
import { findCachedAchievement } from './cachedAchievement';

/**
 * Подсадка достижения из уже загруженного списка. Проверяется на настоящем
 * `QueryClient`, а не на подделке, — по правилу из `cachedNews.test.ts`:
 * искомое здесь — устройство кэша, и мок `getQueryCache` проверял бы только
 * собственную выдумку.
 *
 * От копий при новостях и конференциях эта отличается ровно одним: списков
 * у достижений два вида, и второй — достижения одного преподавателя —
 * обязан искаться так же. Ради него ключи и сведены под общий префикс,
 * поэтому проверка на него здесь не «ещё один случай», а смысл файла.
 */
describe('findCachedAchievement', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
  });

  function page(ids: number[], pageNumber: number): AchievementPage {
    return {
      content: ids.map((id) => makeAchievement({ id, title: `Достижение ${id}` })),
      page: pageNumber,
      size: 20,
      totalElements: 100,
      totalPages: 5,
    };
  }

  /** Кладёт страницу раздела в кэш ровно тем же ключом, каким её кладёт запрос. */
  function seedList(pageNumber: number, ids: number[], updatedAt?: number) {
    queryClient.setQueryData(
      achievementListQuery({ page: pageNumber }).queryKey,
      page(ids, pageNumber),
      updatedAt === undefined ? undefined : { updatedAt },
    );
  }

  it('находит достижение в загруженном разделе', () => {
    seedList(0, [1, 2, 3]);

    expect(findCachedAchievement(queryClient, 2)?.achievement.title).toBe('Достижение 2');
  });

  it('перебирает все загруженные страницы, а не последнюю', () => {
    seedList(1, [21, 22]);
    seedList(4, [81, 82]);

    expect(findCachedAchievement(queryClient, 21)?.achievement.id).toBe(21);
    expect(findCachedAchievement(queryClient, 82)?.achievement.id).toBe(82);
  });

  /**
   * Ради этого случая ключ достижений преподавателя лежит под общим
   * префиксом `lists()`: переход из блока на карточке ППС обязан
   * обходиться без запроса так же, как переход из раздела.
   */
  it('находит достижение в списке одного преподавателя', () => {
    queryClient.setQueryData(teacherAchievementsQuery(7).queryKey, page([31, 32], 0));

    expect(findCachedAchievement(queryClient, 32)?.achievement.id).toBe(32);
  });

  it('на незагруженном достижении возвращает undefined', () => {
    seedList(0, [1, 2, 3]);

    expect(findCachedAchievement(queryClient, 99)).toBeUndefined();
  });

  /**
   * Возраст данных — половина смысла функции: без него `initialData`
   * считается свежей «прямо сейчас», и достижение, открытое через час
   * после загрузки списка, не обновилось бы никогда.
   */
  it('отдаёт время, когда приехал список, а не текущее', () => {
    const hourAgo = Date.now() - 60 * 60 * 1000;
    seedList(0, [1], hourAgo);

    expect(findCachedAchievement(queryClient, 1)?.updatedAt).toBe(hourAgo);
  });

  it('не заглядывает в кэш отдельных достижений', () => {
    queryClient.setQueryData(achievementItemQuery(7).queryKey, makeAchievement({ id: 7 }));

    expect(findCachedAchievement(queryClient, 7)).toBeUndefined();
  });
});
