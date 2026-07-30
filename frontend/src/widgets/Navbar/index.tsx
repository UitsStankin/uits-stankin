import { useState, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { cn } from '@shared/lib/cn';
import { NAVIGATION } from '@shared/config/navigation';
import type { NavItem } from '@shared/types';
import { NavDropdown } from './ui/NavDropdown';
import { NavbarLink } from './ui/NavbarLink';
import { useNavMenu } from './model/useNavMenu';
import { useHoverIntent } from './model/useHoverIntent';
import { containsActivePath, isPathActive } from './lib/navTree';

interface NavbarProps {
  /**
   * Пункты меню. По умолчанию — структура портала, но компонент от неё
   * не зависит: его можно отрендерить с любым деревом.
   */
  items?: readonly NavItem[];
  className?: string;
}

/**
 * Горизонтальное меню под шапкой — как в действующем портале
 * (`layoutType: 'horizontal'` в его app.config.ts).
 *
 * Сборка: соединяет состояние (useNavMenu), тайминги (useHoverIntent) и
 * чистое представление (ui/). Рекурсия по дереву живёт здесь, а не в
 * компонентах, — иначе они не были бы чистыми.
 *
 * Ниже 992px не показывается: там в оригинале включается бургер.
 */
export default function Navbar({ items = NAVIGATION, className }: NavbarProps) {
  const { pathname } = useLocation();
  const { openPath, isOpen, setOpenAt, closeAll, containerRef } = useNavMenu();
  const { schedule, cancel } = useHoverIntent();

  // Переход по ссылке закрывает меню через onNavigate, но кнопками «назад» и
  // «вперёд» оно осталось бы висеть. Приём «правка состояния во время
  // рендера» из документации React — дешевле эффекта, потому что React
  // перезапускает рендер сразу, не показывая промежуточный кадр.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    if (openPath.length > 0) closeAll();
  }

  const renderNode = (node: NavItem, depth: number): ReactNode => {
    if (node.children === undefined) {
      return (
        <NavbarLink
          key={node.key}
          item={node}
          // Активность считаем здесь, чтобы NavbarLink получал булево
          // и мог отсекаться мемоизацией.
          isActive={node.path !== undefined && isPathActive(node.path, pathname)}
          depth={depth}
          onNavigate={closeAll}
        />
      );
    }

    const opened = isOpen(node.key, depth);

    return (
      <NavDropdown
        key={node.key}
        item={node}
        depth={depth}
        isOpen={opened}
        isActive={containsActivePath(node.children, pathname)}
        onToggle={() => {
          cancel();
          setOpenAt(depth, opened ? null : node.key);
        }}
        onPointerEnter={() => schedule(() => setOpenAt(depth, node.key))}
        onPointerLeave={() => schedule(() => setOpenAt(depth, null))}
        onEscape={() => {
          cancel();
          setOpenAt(depth, null);
        }}
      >
        {node.children.map((child) => renderNode(child, depth + 1))}
      </NavDropdown>
    );
  };

  return (
    <nav
      ref={containerRef}
      aria-label="Основная навигация"
      className={cn(
        // $header-navbar-height: 4.375rem — те же 70px, что и у шапки
        'hidden h-header bg-white lg:block',
        className
      )}
    >
      <ul className="mx-auto flex h-full max-w-screen-xxl items-center px-gutter">
        {items.map((item) => renderNode(item, 0))}
      </ul>
    </nav>
  );
}
