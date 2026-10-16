import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@shared/lib/cn';
import type { NavItem } from '@shared/types';

interface NavDropdownProps {
  item: NavItem;
  /** 0 — раздел в верхней строке, больше — вложенная группа внутри панели. */
  depth: number;
  isOpen: boolean;
  /** Активная страница лежит где-то внутри раздела. */
  isActive: boolean;
  onToggle: () => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onEscape: () => void;
  /** Содержимое панели. Дерево собирает index.tsx — здесь рекурсии нет. */
  children: ReactNode;
}

/**
 * Раскрывающийся раздел меню. Чистый: ничего не помнит и ничем не управляет,
 * всё приходит пропсами. Одинаковые пропсы — одинаковый результат.
 */
export function NavDropdown({
  item,
  depth,
  isOpen,
  isActive,
  onToggle,
  onPointerEnter,
  onPointerLeave,
  onEscape,
  children,
}: NavDropdownProps) {
  const Icon = item.icon;
  const isTopLevel = depth === 0;
  const panelId = `nav-panel-${item.key}`;

  return (
    <li
      className="relative"
      onMouseEnter={onPointerEnter}
      onMouseLeave={onPointerLeave}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && isOpen) onEscape();
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-controls={panelId}
        className={cn(
          'flex w-full items-center gap-2 text-sm text-gray-900 transition-colors hover:text-primary',
          isTopLevel
            ? // $nav-menu-height: 3rem, активный подчёркивается снизу
              ['h-12 border-b-2 px-3', isActive ? 'border-primary' : 'border-transparent']
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
            // Вложенная стрелка поворачивается на -90°, потому что панель
            // вылетает вбок, а не раскрывается вниз.
            isOpen && (isTopLevel ? 'rotate-180' : '-rotate-90')
          )}
        />
      </button>

      {/* Свёрнутое поддерево не рендерим вовсе, а не прячем стилями:
          меньше узлов в DOM и ничего лишнего для скринридера. */}
      {isOpen && (
        <ul
          id={panelId}
          className={cn(
            // Панель из SCSS оригинала: белая, min-width 11rem, padding 5px 0,
            // тень 0 2px 12px rgba(0,0,0,.1), радиус $border-radius.
            'absolute z-dropdown min-w-44 rounded bg-white py-1.25 shadow-[0_2px_12px_0_rgba(0,0,0,0.1)]',
            // w-max — ширина по содержимому, как в оригинале. Потолок нужен
            // из-за «Профессорско-преподавательского состава».
            'w-max max-w-sm',
            isTopLevel ? 'top-13 left-0' : 'top-0 left-full'
          )}
        >
          {children}
        </ul>
      )}
    </li>
  );
}
