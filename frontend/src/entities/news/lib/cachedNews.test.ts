import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it } from 'vitest';

import { makeNews } from '@shared/api/mocks';

import { newsItemQuery, newsListQuery } from '../api/newsQueries';
import { findCachedNews } from './cachedNews';

/**
 * Подсадка записи из уже загруженного списка. Проверяется на настоящем
 * `QueryClient`, а не на подделке: искомое здесь — устройство кэша, и мок
 * `getQueryCache` проверял бы только собственную выдумку.
 */
describe('findCachedNews', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
  });

  /** Кладёт страницу списка в кэш ровно тем же ключом, каким её кладёт запрос. */
  function seedList(page: number, ids: number[], updatedAt?: number) {
    queryClient.setQueryData(
      newsListQuery({ page }).queryKey,
      {
        content: ids.map((id) => makeNews({ id, title: `Новость ${id}` })),
        page,
        size: 20,
        totalElements: 100,
        totalPages: 5,
      },
      updatedAt === undefined ? undefined : { updatedAt },
    );
  }

  it('находит запись в загруженном списке', () => {
    seedList(0, [1, 2, 3]);

    expect(findCachedNews(queryClient, 2)?.news.title).toBe('Новость 2');
  });

  /**
   * Тот самый случай из комментария к функции: пользователь долистал
   * до пятой страницы, вернулся на вторую и открыл запись оттуда.
   * Поиск только по текущей странице этот случай терял бы.
   */
  it('перебирает все загруженные страницы, а не последнюю', () => {
    seedList(1, [21, 22]);
    seedList(4, [81, 82]);

    expect(findCachedNews(queryClient, 21)?.news.id).toBe(21);
    expect(findCachedNews(queryClient, 82)?.news.id).toBe(82);
  });

  it('на незагруженной записи возвращает undefined', () => {
    seedList(0, [1, 2, 3]);

    expect(findCachedNews(queryClient, 99)).toBeUndefined();
  });

  it('на пустом кэше возвращает undefined', () => {
    expect(findCachedNews(queryClient, 1)).toBeUndefined();
  });

  /**
   * Возраст данных — половина смысла функции. Без него `initialData`
   * считается свежей «прямо сейчас», и новость, открытая через час после
   * загрузки списка, не обновилась бы никогда.
   */
  it('отдаёт время, когда приехал список, а не текущее', () => {
    const hourAgo = Date.now() - 60 * 60 * 1000;
    seedList(0, [1], hourAgo);

    expect(findCachedNews(queryClient, 1)?.updatedAt).toBe(hourAgo);
  });

  /**
   * Иерархия ключей не украшение: поиск идёт по спискам. Уже открытая
   * отдельная запись лежит под своим ключом, и попадать в выдачу «что
   * лежит в списках» она не должна — иначе `newsKeys.lists()` перестал бы
   * значить то, что значит, и админская инвалидация списков задевала бы
   * открытую статью.
   */
  it('не заглядывает в кэш отдельных записей', () => {
    queryClient.setQueryData(newsItemQuery(7).queryKey, makeNews({ id: 7 }));

    expect(findCachedNews(queryClient, 7)).toBeUndefined();
  });
});
