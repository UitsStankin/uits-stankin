import type { News, PostType } from '@shared/types';

export type TimelineFilter = 'all' | PostType;

const TIMELINE_SIZE = 6;

/** Две выдачи — новости и объявления — в одну ленту, новые сверху. */
export function buildTimeline(
  news: readonly News[],
  announcements: readonly News[],
  filter: TimelineFilter,
): News[] {
  return [...news, ...announcements]
    .filter((item) => filter === 'all' || item.postType === filter)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, TIMELINE_SIZE);
}
