import { useState, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { cn } from '@shared/lib/cn';
import { NAVIGATION } from '@shared/config/navigation';
import type { NavItem } from '@shared/types';
import { NavDropdown } from './ui/NavDropdown';
import { NavbarLink } from './ui/NavbarLink';
import { NavAccordion } from './ui/NavAccordion';
import { MobileNavPanel } from './ui/MobileNavPanel';
import { useNavMenu } from './model/useNavMenu';
import { useHoverIntent } from './model/useHoverIntent';
import { useNavAccordion } from './model/useNavAccordion';
import { useDrawer } from './model/useDrawer';
import { useIsDesktop } from './model/useIsDesktop';
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
 * Навигация портала. Две раскладки одной структуры:
 *
 *   от 992px  горизонтальная строка с выпадающими (как header-navbar)
 *   до 992px  бургер и выезжающая слева панель с аккордеоном (как mobile-nav)
 *
 * Сборка: соединяет хуки и чистые компоненты из ui/, рекурсия по дереву
 * живёт здесь — иначе компоненты не были бы чистыми.
 */
export default function Navbar({ items = NAVIGATION, className }: NavbarProps) {
  const { pathname } = useLocation();
  const isDesktop = useIsDesktop();

  // Десктоп: цепочка раскрытых разделов + задержки наведения.
  const { openPath, isOpen, setOpenAt, closeAll, containerRef } = useNavMenu();
  const { schedule, cancel } = useHoverIntent();

  // Мобильное: множество раскрытых групп + сама выдвижная панель.
  const accordion = useNavAccordion(items, pathname);
  const drawer = useDrawer(pathname);

  // Переход по ссылке закрывает меню через onNavigate, но кнопками «назад»
  // и «вперёд» оно осталось бы висеть. Приём «правка состояния во время
  // рендера» из документации React.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    if (openPath.length > 0) closeAll();
  }

  const renderDesktopNode = (node: NavItem, depth: number): ReactNode => {
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
        {node.children.map((child) => renderDesktopNode(child, depth + 1))}
      </NavDropdown>
    );
  };

  const renderMobileNode = (node: NavItem, depth: number): ReactNode => {
    if (node.children === undefined) {
      return (
        <NavbarLink
          key={node.key}
          item={node}
          isActive={node.path !== undefined && isPathActive(node.path, pathname)}
          // depth+1: в мобильной панели даже верхний уровень — это список,
          // а не строка навбара, поэтому стиль всегда «внутри панели».
          depth={depth + 1}
          onNavigate={drawer.close}
        />
      );
    }

    return (
      <NavAccordion
        key={node.key}
        item={node}
        depth={depth}
        isOpen={accordion.isOpen(node.key)}
        isActive={containsActivePath(node.children, pathname)}
        onToggle={() => accordion.toggle(node.key)}
      >
        {node.children.map((child) => renderMobileNode(child, depth + 1))}
      </NavAccordion>
    );
  };

  // Ниже 992px навбара нет вовсе — только выдвижная панель, а открывает её
  // бургер из шапки. Своей полосы под шапкой мобильная навигация не занимает,
  // как и в оригинале.
  if (!isDesktop) {
    return (
      <MobileNavPanel isOpen={drawer.isOpen} onClose={drawer.close}>
        {items.map((item) => renderMobileNode(item, 0))}
      </MobileNavPanel>
    );
  }

  return (
    <nav
      ref={containerRef}
      aria-label="Основная навигация"
      className={cn(
        // $header-navbar-height: 4.375rem — те же 70px, что и у шапки
        'h-header bg-white',
        className
      )}
    >
      <ul className="mx-auto flex h-full max-w-screen-xxl items-center px-gutter">
        {items.map((item) => renderDesktopNode(item, 0))}
      </ul>
    </nav>
  );
}
