import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowUpRight, ChevronRight, X } from 'lucide-react';

import { Logo } from '@shared/ui/Logo';

import { isPathActive } from '../lib/navTree';
import type { MenuGroup } from '../lib/menuGroups';

interface MenuSheetProps {
  groups: readonly MenuGroup[];
  pathname: string;
  onClose: () => void;
  footer?: ReactNode;
}

const FOCUSABLE = 'a[href], button:not(:disabled)';

/** Каждому разделу — свой цвет бренда: так разделы различимы с первого взгляда. */
const GROUP_COLORS = ['var(--u-brand-blue)', 'var(--u-brand-green)', 'var(--u-brand-pink)'];

function groupColor(index: number): CSSProperties {
  return { '--u-group': GROUP_COLORS[index % GROUP_COLORS.length] } as CSSProperties;
}

/** Раздел, в котором лежит открытая страница; нет такого — первый. */
function initialGroupKey(groups: readonly MenuGroup[], pathname: string): string {
  const current = groups.find((group) =>
    group.entries.some((entry) => entry.kind === 'link' && isPathActive(entry.path, pathname)),
  );
  return (current ?? groups[0])?.key ?? '';
}

/**
 * Лист меню: слева три раздела, справа — ссылки выбранного. Показывается один
 * раздел за раз, а не все сразу: так на экране не двадцать строк текста,
 * а пять-девять. Переключение разделов — без анимации сдвига: текст стоит
 * на месте, меняется только фон.
 */
export function MenuSheet({ groups, pathname, onClose, footer }: MenuSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [activeKey, setActiveKey] = useState(() => initialGroupKey(groups, pathname));

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  const activeIndex = Math.max(
    0,
    groups.findIndex((group) => group.key === activeKey),
  );
  const active = groups[activeIndex];

  const trapFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab' || !sheetRef.current) return;

    const items = sheetRef.current.querySelectorAll<HTMLElement>(FOCUSABLE);
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const moveTab = (event: KeyboardEvent<HTMLDivElement>) => {
    const forward = event.key === 'ArrowDown' || event.key === 'ArrowRight';
    const backward = event.key === 'ArrowUp' || event.key === 'ArrowLeft';
    if (!forward && !backward) return;

    event.preventDefault();
    const next = groups[(activeIndex + (forward ? 1 : -1) + groups.length) % groups.length];
    setActiveKey(next.key);
    event.currentTarget.querySelector<HTMLElement>(`[data-group="${next.key}"]`)?.focus();
  };

  return (
    <div
      ref={sheetRef}
      id="site-menu"
      className="u-menu"
      role="dialog"
      aria-modal="true"
      aria-label="Разделы сайта"
      data-lenis-prevent
      onKeyDown={trapFocus}
    >
      <div className="u-wrap u-menu-head">
        <Logo />
        <button
          ref={closeRef}
          type="button"
          className="u-icon-btn"
          aria-label="Закрыть меню"
          onClick={onClose}
        >
          <X size={22} aria-hidden />
        </button>
      </div>

      <div className="u-wrap u-menu-body">
        <div className="u-menu-tabs" role="tablist" aria-label="Разделы" onKeyDown={moveTab}>
          {groups.map((group, index) => {
            const Icon = group.icon;
            const isActive = group.key === active.key;

            return (
              <button
                key={group.key}
                type="button"
                role="tab"
                id={`menu-tab-${group.key}`}
                data-group={group.key}
                aria-selected={isActive}
                aria-controls={`menu-panel-${group.key}`}
                tabIndex={isActive ? 0 : -1}
                className="u-menu-tab"
                style={groupColor(index)}
                onClick={() => setActiveKey(group.key)}
              >
                <span className="u-menu-tab-icon" aria-hidden>
                  <Icon size={20} />
                </span>
                <span className="u-menu-tab-title">{group.title}</span>
                <ChevronRight className="u-menu-tab-arrow" size={18} aria-hidden />
              </button>
            );
          })}
        </div>

        <div
          key={active.key}
          id={`menu-panel-${active.key}`}
          className="u-menu-panel"
          role="tabpanel"
          aria-labelledby={`menu-tab-${active.key}`}
          style={groupColor(activeIndex)}
        >
          <ul className="u-menu-links">
            {active.entries.map((entry) =>
              entry.kind === 'heading' ? (
                <li key={entry.key} className="u-menu-sub">
                  {entry.title}
                </li>
              ) : (
                <li key={entry.key}>
                  <Link
                    to={entry.path}
                    className="u-menu-item"
                    aria-current={isPathActive(entry.path, pathname) ? 'page' : undefined}
                    onClick={onClose}
                  >
                    <span>{entry.title}</span>
                    <ArrowUpRight size={18} aria-hidden />
                  </Link>
                </li>
              ),
            )}
          </ul>
        </div>
      </div>

      {footer && <div className="u-wrap u-menu-foot">{footer}</div>}
    </div>
  );
}
