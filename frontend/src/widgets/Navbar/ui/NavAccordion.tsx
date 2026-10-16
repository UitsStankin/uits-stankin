import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@shared/lib/cn';
import type { NavItem } from '@shared/types';

interface NavAccordionProps {
  item: NavItem;
  /** Уровень вложенности, задаёт отступ слева. */
  depth: number;
  isOpen: boolean;
  /** Активная страница лежит где-то внутри группы. */
  isActive: boolean;
  onToggle: () => void;
  /** Вложенные пункты. Дерево собирает index.tsx — здесь рекурсии нет. */
  children: ReactNode;
}

/**
 * Раскрывающаяся группа мобильного меню.
 *
 * В отличие от NavDropdown вложенное раскрывается ВНУТРИ списка, а не
 * вылетает вбок: на узком экране улететь некуда.
 *
 * Чистый: ничего не помнит, всё приходит пропсами.
 */
export function NavAccordion({
  item,
  depth,
  isOpen,
  isActive,
  onToggle,
  children,
}: NavAccordionProps) {
  const Icon = item.icon;
  const panelId = `mobile-nav-panel-${item.key}`;

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className={cn(
          'flex w-full items-start gap-2.5 rounded py-2 pr-3 text-left',
          'text-sm leading-tight transition-colors hover:bg-gray-200',
          isActive ? 'text-primary' : 'text-gray-900'
        )}
        style={{ paddingLeft: `${0.75 + depth * 0.75}rem` }}
      >
        {Icon && <Icon size={16} className="mt-0.5 shrink-0" aria-hidden />}
        <span className="flex-1 wrap-break-word">{item.title}</span>
        <ChevronDown
          size={16}
          aria-hidden
          className={cn('mt-0.5 shrink-0 transition-transform', isOpen && 'rotate-180')}
        />
      </button>

      {/* Свёрнутое поддерево не рендерим вовсе, а не прячем стилями:
          меньше узлов в DOM и ничего лишнего для скринридера. */}
      {isOpen && (
        <ul id={panelId} className="mt-0.5 space-y-0.5">
          {children}
        </ul>
      )}
    </li>
  );
}
