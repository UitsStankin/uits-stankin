import { useState } from 'react';
import { Link } from 'react-router';

import { newsItemRoute } from '@shared/config/routes';
import { BrandPattern } from '@shared/ui/brand/BrandPattern';
import { BorderBeam } from '@shared/ui/brand/BorderBeam';
import { Button } from '@shared/ui/brand/Button';
import type { News } from '@shared/types';

import { BRAND_COLORS } from '@shared/config/brandColors';
import type { ProgramKey } from '../lib/programs';
import { AnchorLink } from './AnchorLink';

const HERO_PATTERN_SEED = 1930;

const HERO_PATHS: readonly { key: ProgramKey; label: string }[] = [
  { key: 'bac', label: 'Бакалавриат 09.03.03' },
  { key: 'mag', label: 'Магистратура 09.04.01' },
  { key: 'phd', label: 'Аспирантура' },
];

interface HeroProps {
  announcement: News | undefined;
  onSearch: (query: string) => void;
  onPickProgram: (key: ProgramKey) => void;
}

export function Hero({ announcement, onSearch, onPickProgram }: HeroProps) {
  const [value, setValue] = useState('');

  return (
    <section className="u-hero" aria-labelledby="hero-title">
      <BrandPattern className="u-hero-pattern" seed={HERO_PATTERN_SEED} colors={BRAND_COLORS} spin />
      <div className="u-hero-shade" aria-hidden />

      <div className="u-wrap u-hero-body">
        {announcement && (
          <Link to={newsItemRoute(announcement.id)} className="u-badge">
            <span className="u-badge-tag">Объявление</span>
            <span className="u-badge-text">{announcement.title}</span>
            <span className="u-badge-arrow" aria-hidden>
              →
            </span>
          </Link>
        )}

        <h1 id="hero-title" className="u-hero-title">
          Управление и&nbsp;информатика <span className="u-accent">в&nbsp;технических системах</span>
        </h1>
        <p className="u-hero-lede">
          Бакалавриат 09.03.03, магистратура 09.04.01 и&nbsp;аспирантура на кафедре МГТУ «СТАНКИН».
          На сайте расписание, учебные планы и&nbsp;новости.
        </p>

        <form
          className="u-hero-form"
          role="search"
          aria-label="Расписание преподавателя или группы"
          onSubmit={(event) => {
            event.preventDefault();
            onSearch(value);
          }}
        >
          <label htmlFor="hero-q" className="u-label">
            Расписание преподавателя или группы
          </label>
          <BorderBeam className="u-search">
            <input
              id="hero-q"
              type="search"
              autoComplete="off"
              placeholder="фамилия или номер группы"
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
            <Button type="submit">Показать пары</Button>
          </BorderBeam>
        </form>

        <ul className="u-hero-paths">
          {HERO_PATHS.map((path) => (
            <li key={path.key}>
              <AnchorLink
                target="programs"
                className="u-path u-nw"
                onActivate={() => onPickProgram(path.key)}
              >
                {path.label}
              </AnchorLink>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
