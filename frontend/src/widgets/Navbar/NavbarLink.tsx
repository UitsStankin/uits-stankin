import { memo } from 'react';
import { Link } from 'react-router';
import { cn } from '@shared/lib/cn';
import type { NavItem } from '@shared/types';

interface NavbarLinkProps {
  item: NavItem;
  /** Считается родителем, а не через NavLink — иначе мемоизация бесполезна. */
  isActive: boolean;
  /** 0 — верхняя строка навбара, больше — внутри выпадающей панели. */
  depth: number;
  onNavigate?: () => void;
}

function NavbarLinkBase({ item, isActive, depth, onNavigate }: NavbarLinkProps) {
  const Icon = item.icon;
  const isTopLevel = depth === 0;

  return (
    <li>
      <Link
        to={item.path ?? '/'}
        onClick={onNavigate}
        aria-current={isActive ? 'page' : undefined}
        className={cn(
          // $nav-menu-item-color: $gray-900, hover: $primary
          'flex items-center gap-2 text-sm text-gray-900 transition-colors hover:text-primary',
          isTopLevel
            // $nav-menu-height: 3rem. Активный помечается подчёркиванием
            // border-bottom: 2px solid $primary, а не заливкой.
            ? ['h-12 border-b-2 px-3', isActive ? 'border-primary' : 'border-transparent']
            : ['px-2.5 py-2', isActive && 'text-primary']
        )}
      >
        {Icon && <Icon size={18} className="shrink-0" aria-hidden />}
        {/* Внутри панели перенос разрешён: её ширину задаёт w-max с потолком,
            см. NavDropdown. В верхней строке перенос недопустим — пункты
            разъехались бы по высоте. */}
        <span className={cn(isTopLevel && 'whitespace-nowrap')}>
          {item.title}
        </span>
      </Link>
    </li>
  );
}

/**
 * Ссылок в меню 23, разделов 3. Мемоизируем ссылки — тех, кого много.
 *
 * Пропсы примитивные: `item` — стабильная ссылка на объект из модуля-константы,
 * `isActive` булев, `onNavigate` приходит из useCallback с пустыми зависимостями.
 * При переходе между страницами активность меняется максимум у двух пунктов,
 * остальные сравнение пропсов отсеивает.
 *
 * Если бы вместо этого стоял NavLink из react-router, он подписался бы на
 * контекст роутера сам, и memo не спас бы: контекст меняется при каждой
 * навигации, перерисовывались бы все.
 */
export const NavbarLink = memo(NavbarLinkBase);
