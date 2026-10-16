import { Link } from 'react-router';
import { cn } from '@shared/lib/cn';
import type { NavItem } from '@shared/types';

interface NavbarLinkProps {
  item: NavItem;
  /**
   * Считается родителем, а не берётся из NavLink.
   *
   * NavLink подписался бы на контекст роутера сам, и каждая из 23 ссылок
   * перерисовывалась бы на любой навигации. С булевым пропсом компилятор
   * отсекает те, у которых активность не менялась.
   */
  isActive: boolean;
  /** 0 — верхняя строка навбара, больше — внутри выпадающей панели. */
  depth: number;
  onNavigate?: () => void;
}

export function NavbarLink({ item, isActive, depth, onNavigate }: NavbarLinkProps) {
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
