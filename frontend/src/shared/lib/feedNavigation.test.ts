import { describe, expect, it } from 'vitest';

import { feedLinkState, readFeedUrl } from './feedNavigation';

describe('feedLinkState', () => {
  it('запоминает адрес ленты вместе со страницей', () => {
    expect(feedLinkState({ pathname: '/about/news', search: '?page=3' })).toEqual({
      feedUrl: '/about/news?page=3',
    });
  });

  it('без параметров — просто путь', () => {
    expect(feedLinkState({ pathname: '/about/announcements', search: '' })).toEqual({
      feedUrl: '/about/announcements',
    });
  });
});

describe('readFeedUrl', () => {
  it('достаёт адрес ленты из состояния перехода', () => {
    expect(readFeedUrl({ feedUrl: '/about/news?page=3' })).toBe('/about/news?page=3');
  });

  it('без состояния или с чужим состоянием отвечает null', () => {
    expect(readFeedUrl(null)).toBeNull();
    expect(readFeedUrl(undefined)).toBeNull();
    expect(readFeedUrl('строка')).toBeNull();
    expect(readFeedUrl({ другое: 1 })).toBeNull();
  });

  it('не доверяет адресам вне портала', () => {
    expect(readFeedUrl({ feedUrl: 'https://example.com/' })).toBeNull();
    expect(readFeedUrl({ feedUrl: '//example.com/' })).toBeNull();
    expect(readFeedUrl({ feedUrl: 42 })).toBeNull();
  });
});
