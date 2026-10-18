import { Link } from 'react-router';

import { cn } from '@shared/lib/cn';
import { MorphTabs } from '@shared/ui/brand/MorphTabs';

import { PROGRAMS, type Program, type ProgramKey } from '../lib/programs';

const TAB_ITEMS = PROGRAMS.map((program) => ({ key: program.key, label: program.tab }));

interface ProgramsBlockProps {
  value: ProgramKey;
  onChange: (key: ProgramKey) => void;
}

/**
 * Уровни обучения. Все три панели лежат в одной ячейке сетки друг на друге,
 * и переключение — это перекрёстное проявление: высота блока равна самой
 * высокой панели и не прыгает, а ничего не размонтируется и не мигает.
 * Неактивные панели скрыты от скринридера и от табуляции.
 */
export function ProgramsBlock({ value, onChange }: ProgramsBlockProps) {
  return (
    <section id="programs" className="u-wrap u-programs-block" aria-labelledby="h-programs">
      <div className="u-programs-head">
        <h2 id="h-programs" className="u-section-title">
          Обучение
        </h2>
        <MorphTabs
          items={TAB_ITEMS}
          value={value}
          onChange={onChange}
          label="Уровни обучения"
          idPrefix="tab"
          panelIdPrefix="panel"
        />
      </div>

      <div className="u-program-stack">
        {PROGRAMS.map((program) => {
          const isActive = program.key === value;

          return (
            <div
              key={program.key}
              id={`panel-${program.key}`}
              className={cn('u-program-pane', isActive && 'u-is-on')}
              role="tabpanel"
              aria-labelledby={`tab-${program.key}`}
              aria-hidden={!isActive}
              inert={!isActive}
            >
              <ProgramPanel program={program} />
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ProgramPanel({ program }: { program: Program }) {
  return (
    <>
      <div className="u-program-hero">
        <p className="u-program-kind">{program.kind}</p>
        <div className="u-program-main">
          {program.code && (
            <p className={program.key === 'mag' ? 'u-program-code u-alt' : 'u-program-code'}>
              {program.code}
            </p>
          )}
          <h3 className="u-program-name">{program.name}</h3>
        </div>
      </div>

      <ul className={program.links.length > 3 ? 'u-program-links u-four' : 'u-program-links'}>
        {program.links.map((link) => (
          <li key={link.href}>
            <Link to={link.href} className="u-program-link">
              <strong>
                {link.title}
                <span aria-hidden>→</span>
              </strong>
              <small>{link.note}</small>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
