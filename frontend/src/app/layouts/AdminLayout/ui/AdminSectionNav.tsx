import { NavLink } from 'react-router';

import type { AdminSection } from '@shared/config/adminNavigation';
import { cn } from '@shared/lib';

interface AdminSectionNavProps {
  sections: readonly AdminSection[];
}

/**
 * Меню разделов админки. Чистое: список приходит пропсом, активный пункт
 * определяет роутер.
 *
 * Колонкой слева на широком экране и горизонтальной лентой на узком —
 * вертикальный список из девяти пунктов на телефоне отодвинул бы таблицу
 * на второй экран. Это единственное место портала с боковым меню:
 * публичная часть горизонтальная, как в оригинале, а здесь разделов
 * вдвое больше, чем помещается в строку.
 */
export function AdminSectionNav({ sections }: AdminSectionNavProps) {
  return (
    <nav
      aria-label="Разделы админки"
      className="-mx-gutter-sm overflow-x-auto px-gutter-sm lg:mx-0 lg:w-64 lg:shrink-0 lg:overflow-visible lg:px-0"
    >
      <ul className="flex gap-1 lg:flex-col">
        {sections.map(({ key, title, icon: Icon, path, plannedIn }) => (
          <li key={key}>
            <NavLink
              to={path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 whitespace-nowrap rounded px-3 py-2 text-base transition-colors lg:whitespace-normal',
                  isActive
                    ? 'bg-primary font-bold text-white'
                    : 'text-text-default hover:bg-background-default',
                  // Раздел, которого ещё нет, приглушён: ссылка живая
                  // и ведёт к объяснению, но обещать по ней рабочий экран
                  // нельзя.
                  plannedIn && 'text-text-muted',
                )
              }
            >
              <Icon aria-hidden="true" className="size-4 shrink-0" />
              <span>{title}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
