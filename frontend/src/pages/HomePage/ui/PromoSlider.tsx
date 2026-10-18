import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Megaphone, Trophy, type LucideIcon } from 'lucide-react';

import { achievementRoute, conferenceRoute, newsItemRoute } from '@shared/config/routes';
import { ButtonLink } from '@shared/ui/brand/Button';
import type { Achievement, Conference, News } from '@shared/types';

import { dayAndMonth } from '../lib/homeFormat';

type PromoTone = 'violet' | 'green' | 'blue';

interface PromoCard {
  key: string;
  kind: string;
  tone: PromoTone;
  title: string;
  text: string;
  href: string;
  cta: string;
  image: string | null;
  figure: { day: number; month: string } | null;
  icon: LucideIcon;
}

interface PromoSliderProps {
  conference: Conference | undefined;
  achievement: Achievement | undefined;
  announcement: News | undefined;
}

const CARD_GAP_PX = 16;

function buildCards({ conference, achievement, announcement }: PromoSliderProps): PromoCard[] {
  const cards: PromoCard[] = [];

  if (conference) {
    cards.push({
      key: `conference-${conference.id}`,
      kind: 'Конференция',
      tone: 'violet',
      title: conference.title,
      text: conference.description ?? 'Конференция кафедры',
      href: conferenceRoute(conference.id),
      cta: 'О конференции',
      image: conference.previewImageUrl,
      figure: dayAndMonth(conference.startDate),
      icon: Megaphone,
    });
  }
  if (achievement) {
    cards.push({
      key: `achievement-${achievement.id}`,
      kind: 'Достижение',
      tone: 'green',
      title: achievement.title,
      text: achievement.description,
      href: achievementRoute(achievement.id),
      cta: 'Подробнее',
      image: achievement.previewImageUrl,
      figure: null,
      icon: Trophy,
    });
  }
  if (announcement) {
    cards.push({
      key: `announcement-${announcement.id}`,
      kind: 'Объявление',
      tone: 'blue',
      title: announcement.title,
      text: announcement.shortDescription ?? 'Объявление кафедры',
      href: newsItemRoute(announcement.id),
      cta: 'Читать объявление',
      image: announcement.previewImageUrl,
      figure: null,
      icon: Megaphone,
    });
  }

  return cards;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * Карусель «Главное сейчас»: по одной карточке на экран, без «выглядывающей»
 * соседней — обрезанный край читался как недоделка. Слева текст и кнопка,
 * справа обложка; без обложки — дата крупно либо значок. Под карточкой
 * счётчик и две круглые кнопки.
 */
export function PromoSlider(props: PromoSliderProps) {
  const cards = buildCards(props);
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  if (cards.length === 0) return null;

  const step = () => {
    const first = trackRef.current?.firstElementChild;
    return first
      ? first.getBoundingClientRect().width + CARD_GAP_PX
      : (trackRef.current?.clientWidth ?? 0);
  };

  const scrollByCard = (direction: 1 | -1) => {
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth';
    trackRef.current?.scrollBy({ left: direction * step(), behavior });
  };

  return (
    <section
      className="u-wrap u-promo"
      role="region"
      aria-roledescription="карусель"
      aria-label="Главное сейчас"
    >
      <div
        ref={trackRef}
        className="u-promo-track"
        tabIndex={0}
        aria-label="Карточки, листаются по горизонтали"
        onScroll={(event) => {
          const width = step();
          setIndex(width > 0 ? Math.round(event.currentTarget.scrollLeft / width) : 0);
        }}
      >
        {cards.map((card, position) => {
          const Icon = card.icon;

          return (
            <article
              key={card.key}
              className="u-promo-card"
              data-tone={card.tone}
              role="group"
              aria-roledescription="слайд"
              aria-label={`${position + 1} из ${cards.length}`}
            >
              <div className="u-promo-copy">
                <p className="u-promo-kind">{card.kind}</p>
                <h3>{card.title}</h3>
                <p className="u-promo-text">{card.text}</p>
                <ButtonLink to={card.href} icon={<ArrowRight size={16} aria-hidden />}>
                  {card.cta}
                </ButtonLink>
              </div>

              <div className="u-promo-media" aria-hidden>
                {card.image ? (
                  <img className="u-promo-img" src={card.image} alt="" loading="lazy" />
                ) : card.figure ? (
                  <div className="u-promo-figure">
                    {card.figure.day}
                    <small>{card.figure.month}</small>
                  </div>
                ) : (
                  <Icon size={72} strokeWidth={1.25} />
                )}
              </div>
            </article>
          );
        })}
      </div>

      {cards.length > 1 && (
        <div className="u-slider-nav">
          <p className="u-slider-count" aria-hidden>
            {pad(index + 1)} <span>/ {pad(cards.length)}</span>
          </p>
          <div className="u-slider-buttons">
            <button
              type="button"
              className="u-round-btn"
              aria-label="Предыдущая карточка"
              onClick={() => scrollByCard(-1)}
            >
              <ArrowLeft size={20} aria-hidden />
            </button>
            <button
              type="button"
              className="u-round-btn"
              aria-label="Следующая карточка"
              onClick={() => scrollByCard(1)}
            >
              <ArrowRight size={20} aria-hidden />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
