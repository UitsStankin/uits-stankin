import { useRef } from 'react';
import { ArrowLeft, ArrowRight, Megaphone, Trophy, type LucideIcon } from 'lucide-react';

import { achievementRoute, conferenceRoute, newsItemRoute } from '@shared/config/routes';
import { ButtonLink } from '@shared/ui/brand/Button';
import type { Achievement, Conference, News } from '@shared/types';

import { dayAndMonth } from '../lib/homeFormat';
import { useEndlessTrack } from '../model/useEndlessTrack';

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

/**
 * Карусель «Главное сейчас»: бесконечная лента карточек, одна за другой по
 * кольцу, без номеров. Активная карточка стоит по центру, соседние видны
 * по краям и приглушены. Слева текст и кнопка, справа обложка; без обложки
 * дата крупно либо значок. Стрелки сидят на краях центральной карточки,
 * на узком экране — парой под лентой.
 */
export function PromoSlider(props: PromoSliderProps) {
  const cards = buildCards(props);
  const trackRef = useRef<HTMLDivElement>(null);
  const { copies, step } = useEndlessTrack(trackRef, cards.length);

  if (cards.length === 0) return null;

  const isLoop = cards.length > 1;
  const middleCopy = (copies - 1) / 2;

  return (
    <section
      className="u-wrap u-promo"
      role="region"
      aria-roledescription="карусель"
      aria-label="Главное сейчас"
    >
      <div className="u-promo-stage">
        <div
          ref={trackRef}
          className={isLoop ? 'u-promo-track' : 'u-promo-track u-promo-track--single'}
          tabIndex={0}
          aria-label="Карточки, листаются по горизонтали"
          onKeyDown={(event) => {
            if (!isLoop) return;
            if (event.key === 'ArrowRight') {
              event.preventDefault();
              step(1);
            } else if (event.key === 'ArrowLeft') {
              event.preventDefault();
              step(-1);
            }
          }}
        >
          {Array.from({ length: copies }, (_, copy) =>
            cards.map((card, position) => {
              const Icon = card.icon;
              const isReal = copy === middleCopy;

              return (
                <article
                  key={`${card.key}-${copy}`}
                  className="u-promo-card"
                  data-slide=""
                  data-active={isLoop ? undefined : 'true'}
                  data-tone={card.tone}
                  role={isReal ? 'group' : undefined}
                  aria-roledescription={isReal ? 'слайд' : undefined}
                  aria-label={isReal ? `${position + 1} из ${cards.length}` : undefined}
                  aria-hidden={isReal ? undefined : true}
                  inert={isReal ? undefined : true}
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
            }),
          )}
        </div>

        {isLoop && (
          <div className="u-promo-nav">
            <button
              type="button"
              className="u-round-btn u-promo-arrow u-promo-arrow--prev"
              aria-label="Предыдущая карточка"
              onClick={() => step(-1)}
            >
              <ArrowLeft size={20} aria-hidden />
            </button>
            <button
              type="button"
              className="u-round-btn u-promo-arrow u-promo-arrow--next"
              aria-label="Следующая карточка"
              onClick={() => step(1)}
            >
              <ArrowRight size={20} aria-hidden />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
