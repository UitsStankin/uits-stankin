import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it } from 'vitest';

import { makeConference } from '@shared/api/mocks';

import { conferenceItemQuery, conferenceListQuery } from '../api/conferenceQueries';
import { findCachedConference } from './cachedConference';

/**
 * Подсадка объявления из уже загруженного списка. Проверяется на настоящем
 * `QueryClient`, а не на подделке, — по правилу из `cachedNews.test.ts`:
 * искомое здесь — устройство кэша, и мок `getQueryCache` проверял бы только
 * собственную выдумку. Набор случаев тот же: функция — копия при своей
 * сущности, и расходиться с оригиналом ей не в чем.
 */
describe('findCachedConference', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
  });

  /** Кладёт страницу списка в кэш ровно тем же ключом, каким её кладёт запрос. */
  function seedList(page: number, ids: number[], updatedAt?: number) {
    queryClient.setQueryData(
      conferenceListQuery({ page }).queryKey,
      {
        content: ids.map((id) => makeConference({ id, title: `Конференция ${id}` })),
        page,
        size: 20,
        totalElements: 100,
        totalPages: 5,
      },
      updatedAt === undefined ? undefined : { updatedAt },
    );
  }

  it('находит объявление в загруженном списке', () => {
    seedList(0, [1, 2, 3]);

    expect(findCachedConference(queryClient, 2)?.conference.title).toBe('Конференция 2');
  });

  it('перебирает все загруженные страницы, а не последнюю', () => {
    seedList(1, [21, 22]);
    seedList(4, [81, 82]);

    expect(findCachedConference(queryClient, 21)?.conference.id).toBe(21);
    expect(findCachedConference(queryClient, 82)?.conference.id).toBe(82);
  });

  it('на незагруженном объявлении возвращает undefined', () => {
    seedList(0, [1, 2, 3]);

    expect(findCachedConference(queryClient, 99)).toBeUndefined();
  });

  /**
   * Возраст данных — половина смысла функции: без него `initialData`
   * считается свежей «прямо сейчас», и объявление, открытое через час
   * после загрузки списка, не обновилось бы никогда.
   */
  it('отдаёт время, когда приехал список, а не текущее', () => {
    const hourAgo = Date.now() - 60 * 60 * 1000;
    seedList(0, [1], hourAgo);

    expect(findCachedConference(queryClient, 1)?.updatedAt).toBe(hourAgo);
  });

  it('не заглядывает в кэш отдельных объявлений', () => {
    queryClient.setQueryData(conferenceItemQuery(7).queryKey, makeConference({ id: 7 }));

    expect(findCachedConference(queryClient, 7)).toBeUndefined();
  });
});
