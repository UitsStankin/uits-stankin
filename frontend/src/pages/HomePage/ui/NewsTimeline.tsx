import { useState } from 'react';
import { Link } from 'react-router';

import { formatDate } from '@shared/lib';
import { MorphTabs } from '@shared/ui/brand/MorphTabs';
import type { News, PostType } from '@shared/types';

import { HOME_FEED_COPY } from '../lib/homeFeedCopy';
import { buildTimeline, type TimelineFilter } from '../lib/timeline';
import type { HomeListState } from '../model/useHomeContent';
import { SectionStatus } from './SectionStatus';

const FILTER_ITEMS: readonly { key: TimelineFilter; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'news', label: 'Новости' },
  { key: 'announcements', label: 'Объявления' },
];

interface NewsTimelineProps {
  news: HomeListState<News>;
  announcements: HomeListState<News>;
  hrefForItem: (id: number) => string;
}

export function NewsTimeline({ news, announcements, hrefForItem }: NewsTimelineProps) {
  const [filter, setFilter] = useState<TimelineFilter>('all');

  const items = buildTimeline(news.items, announcements.items, filter);
  const feeds: readonly [PostType, HomeListState<News>][] =
    filter === 'all'
      ? [
          ['news', news],
          ['announcements', announcements],
        ]
      : [[filter, filter === 'news' ? news : announcements]];

  return (
    <section id="news" className="u-news-sec" aria-labelledby="h-news">
      <div className="u-wrap u-news-block u-news-split">
        <div className="u-news-head">
          <h2 id="h-news" className="u-section-title">
            Новости
          </h2>
          <MorphTabs
            items={FILTER_ITEMS}
            value={filter}
            onChange={setFilter}
            label="Фильтр новостей"
            mode="filter"
          />
        </div>

        <div className="u-news-body">
          {feeds.map(([type, feed]) => (
            <SectionStatus
              key={type}
              state={{ ...feed, isEmpty: feed.isEmpty && items.length === 0 }}
              loading={HOME_FEED_COPY[type].loading}
              errorTitle={HOME_FEED_COPY[type].errorTitle}
              emptyTitle={HOME_FEED_COPY[type].emptyTitle}
              emptyDescription={HOME_FEED_COPY[type].emptyDescription}
            />
          ))}

          {items.length > 0 && (
            <ol className="u-timeline">
              {items.map((item) => (
                <TimelineItem key={item.id} item={item} href={hrefForItem(item.id)} />
              ))}
            </ol>
          )}

          {items.length > 0 && (
            <div className="u-timeline-more">
              {news.items.length > 0 && (
                <Link className="u-btn-ghost u-nw" to={HOME_FEED_COPY.news.allHref}>
                  {HOME_FEED_COPY.news.allLabel}
                </Link>
              )}
              {announcements.items.length > 0 && (
                <Link className="u-btn-ghost u-nw" to={HOME_FEED_COPY.announcements.allHref}>
                  {HOME_FEED_COPY.announcements.allLabel}
                </Link>
              )}
            </div>
          )}
          </div>
      </div>
    </section>
    );
  }

  function TimelineItem({ item, href }: { item: News; href: string }) {
    const isAnnouncement = item.postType === 'announcements';
    const date = formatDate(item.createdAt);

    return (
      <li className={isAnnouncement ? 'u-tl-item u-is-ann' : 'u-tl-item'}>
        <div className="u-tl-meta">
          {date && <time dateTime={item.createdAt}>{date}</time>}
          <span className="u-tl-kind">{isAnnouncement ? 'Объявление' : 'Новость'}</span>
      </div>
      <h3 className="u-tl-title">
        <Link to={href}>{item.title}</Link>
      </h3>
      {item.shortDescription && <p className="u-tl-lead">{item.shortDescription}</p>}
    </li>
  );
}
