import type { Location } from 'react-router';

/**
 * Что карточка ленты кладёт в переход на запись: адрес ленты вместе
 * со страницей и фильтром. По нему запись знает, что читатель пришёл
 * из списка, и может вернуть его туда же.
 */
export interface FeedLinkState {
  feedUrl: string;
}

export function feedLinkState({ pathname, search }: Pick<Location, 'pathname' | 'search'>): FeedLinkState {
  return { feedUrl: `${pathname}${search}` };
}

/**
 * Адрес ленты из состояния перехода; `null` — читатель пришёл не из ленты
 * (с главной, из поиска, по прямой ссылке) либо в состоянии лежит
 * не адрес внутри портала.
 */
export function readFeedUrl(state: unknown): string | null {
  if (typeof state !== 'object' || state === null) return null;

  const { feedUrl } = state as { feedUrl?: unknown };

  return typeof feedUrl === 'string' && feedUrl.startsWith('/') && !feedUrl.startsWith('//')
    ? feedUrl
    : null;
}
