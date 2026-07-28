import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@shared/lib/cn';
import type { NavItem } from '@shared/types';
import { NavbarLink } from './NavbarLink';
import { containsActivePath, isPathActive } from './lib/navTree';

/** Задержка наведения из оригинала: 150 мс и на открытие, и на закрытие. */
const HOVER_DELAY_MS = 150;

interface NavDropdownProps {
  item: NavItem;
  /** 0 — раздел в верхней строке, больше — вложенная группа внутри панели. */
  depth: number;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  pathname: string;
  /** Закрыть всё меню после перехода по ссылке. */
  onNavigate: () => void;
}

export function NavDropdown({
  item,
  depth,
  isOpen,
  onOpenChange,
  pathname,
  onNavigate,
}: NavDropdownProps) {
  const children = item.children ?? [];
  const Icon = item.icon;
  const isTopLevel = depth === 0;
  const panelId = `nav-panel-${item.key}`;

  // Раздел подсвечивается, если активная страница лежит где-то внутри него.
  const isActive = containsActivePath(children, pathname);

  // Какая из вложенных групп раскрыта. Состояние держит родитель, а не сам
  // ребёнок, — так одновременно открыт максимум один вылет на уровне.
  const [openChildKey, setOpenChildKey] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== undefined) clearTimeout(timerRef.current);
  }, []);

  const scheduleOpen = useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(() => onOpenChange(true), HOVER_DELAY_MS);
  }, [clearTimer, onOpenChange]);

  const scheduleClose = useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(() => {
      onOpenChange(false);
      setOpenChildKey(null);
    }, HOVER_DELAY_MS);
  }, [clearTimer, onOpenChange, setOpenChildKey]);

  // Таймер, доживший до размонтирования, дёрнул бы setState у мёртвого
  // компонента. Заодно снимает подвисший таймер при быстром уходе мышью.
  useEffect(() => clearTimer, [clearTimer]);

  // Клик и клавиатура — добавка к оригиналу, где выпадающие открывались
  // ТОЛЬКО по наведению. Из-за этого меню было недоступно с клавиатуры
  // и не открывалось на планшетах: они шире 992px и получают десктопный
  // навбар, а наведения на тач-экране нет.
  const handleClick = useCallback(() => {
    clearTimer();
    onOpenChange(!isOpen);
    if (isOpen) setOpenChildKey(null);
  }, [clearTimer, isOpen, onOpenChange, setOpenChildKey]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key !== 'Escape' || !isOpen) return;
      clearTimer();
      onOpenChange(false);
      setOpenChildKey(null);
    },
    [clearTimer, isOpen, onOpenChange, setOpenChildKey]
  );

  return (
    <li
      className={cn('relative', !isTopLevel && 'block')}
      onMouseEnter={scheduleOpen}
      onMouseLeave={scheduleClose}
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        onClick={handleClick}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-controls={panelId}
        className={cn(
          'flex w-full items-center gap-2 text-sm text-gray-900 transition-colors hover:text-primary',
          isTopLevel
            ? ['h-12 border-b-2 px-3', isActive ? 'border-primary' : 'border-transparent']
            : ['px-2.5 py-2 text-left', isActive && 'text-primary']
        )}
      >
        {Icon && <Icon size={18} className="shrink-0" aria-hidden />}
        <span className={cn('flex-1 text-left', isTopLevel && 'whitespace-nowrap')}>
          {item.title}
        </span>
        <ChevronDown
          size={16}
          aria-hidden
          className={cn(
            'shrink-0 transition-transform',
            // В оригинале вложенная стрелка поворачивается на -90°, потому что
            // панель вылетает вбок, а не раскрывается вниз.
            isOpen && (isTopLevel ? 'rotate-180' : '-rotate-90')
          )}
        />
      </button>

      {isOpen && (
        <ul
          id={panelId}
          className={cn(
            // Панель из SCSS оригинала: белая, min-width 11rem, padding 5px 0,
            // тень 0 2px 12px rgba(0,0,0,.1), радиус $border-radius.
            'absolute z-dropdown min-w-44 rounded bg-white py-[5px] shadow-[0_2px_12px_0_rgba(0,0,0,0.1)]',
            // w-max — ширина по содержимому, как в оригинале. Ограничение
            // сверху нужно из-за «Профессорско-преподавательского состава»:
            // без него вылет растянулся бы на пол-экрана.
            'w-max max-w-sm',
            isTopLevel
              ? 'top-[3.25rem] left-0'
              : // Вложенная панель вылетает вправо: left: 100%, top: 0
                'top-0 left-full'
          )}
        >
          {children.map((child) =>
            child.children ? (
              <NavDropdown
                key={child.key}
                item={child}
                depth={depth + 1}
                isOpen={openChildKey === child.key}
                onOpenChange={(open) => setOpenChildKey(open ? child.key : null)}
                pathname={pathname}
                onNavigate={onNavigate}
              />
            ) : (
              <NavbarLink
                key={child.key}
                item={child}
                // Активность считаем здесь, чтобы NavbarLink получал булево
                // и мог отсекаться мемоизацией.
                isActive={child.path !== undefined && isPathActive(child.path, pathname)}
                depth={depth + 1}
                onNavigate={onNavigate}
              />
            )
          )}
        </ul>
      )}
    </li>
  );
}
