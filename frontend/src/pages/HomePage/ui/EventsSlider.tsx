import { useState } from 'react';
import { Link } from 'react-router';

import { achievementRoute, conferenceRoute, CONFERENCES_ROUTE } from '@shared/config/routes';
import { conferenceDatesLabel } from '@entities/conference';
import { formatDate } from '@shared/lib';
import type { Achievement, Conference } from '@shared/types';

import type { HomeListState } from '../model/useHomeContent';
import { SectionStatus } from './SectionStatus';

interface EventItem {
  key: string;
  kind: string;
  date: string;
  title: string;
  text: string | null;
  image: string | null;
  href: string;
}

function conferenceItem(conference: Conference): EventItem {
  const dates = conferenceDatesLabel(conference.startDate, conference.endDate);
  return {
    key: `conference-${conference.id}`,
    kind: 'Конференция',
    date: [dates, conference.time].filter(Boolean).join(', '),
    title: conference.title,
    text: conference.description,
    image: conference.previewImageUrl,
    href: conferenceRoute(conference.id),
  };
}

function achievementItem(achievement: Achievement): EventItem {
  return {
    key: `achievement-${achievement.id}`,
    kind: 'Достижение',
    date: formatDate(achievement.createdAt) ?? '',
    title: achievement.title,
    text: achievement.description,
    image: achievement.previewImageUrl,
    href: achievementRoute(achievement.id),
  };
}

interface EventsSliderProps {
  conferences: HomeListState<Conference>;
  achievements: HomeListState<Achievement>;
}

export function EventsSlider({ conferences, achievements }: EventsSliderProps) {
  const items = [...conferences.items.map(conferenceItem), ...achievements.items.map(achievementItem)];
  const status = {
    isLoading: conferences.isLoading || achievements.isLoading,
    isOffline: conferences.isOffline && achievements.isOffline,
    isError: conferences.isError && achievements.isError,
    errorMessage: conferences.errorMessage,
    isEmpty: conferences.isEmpty && achievements.isEmpty,
    refetch: () => {
      conferences.refetch();
      achievements.refetch();
    },
  };

  return (
    <section id="events" className="u-events-block" aria-labelledby="h-events">
      <div className="u-wrap u-section-head">
        <h2 id="h-events" className="u-section-title">
          Мероприятия
        </h2>
        <Link className="u-btn-ghost u-nw" to={CONFERENCES_ROUTE}>
          Все мероприятия
        </Link>
      </div>

      {items.length > 0 ? (
        <div className="u-wrap">
          <div
            className="u-events-track"
            tabIndex={0}
            aria-label="Мероприятия, листаются по горизонтали"
          >
            {items.map((item) => (
              <EventCard key={item.key} item={item} />
            ))}
          </div>
        </div>
      ) : (
        <div className="u-wrap">
          <SectionStatus
            state={status}
            loading="Загрузка мероприятий"
            errorTitle="Не удалось загрузить мероприятия"
            emptyTitle="Мероприятий пока нет"
          />
        </div>
      )}
    </section>
  );
}

function EventCard({ item }: { item: EventItem }) {
  const [isBroken, setIsBroken] = useState(false);

  return (
    <Link to={item.href} className="u-event">
      {item.image && !isBroken && (
        <img
          className="u-event-img"
          src={item.image}
          alt=""
          loading="lazy"
          width={352}
          height={220}
          onError={() => setIsBroken(true)}
        />
      )}
      <div className="u-event-body">
        <span className="u-event-date">{item.date}</span>
        <h3 className="u-event-title">{item.title}</h3>
        {item.text && <p className="u-event-text">{item.text}</p>}
        <span className="u-event-kind">{item.kind}</span>
      </div>
    </Link>
  );
}
