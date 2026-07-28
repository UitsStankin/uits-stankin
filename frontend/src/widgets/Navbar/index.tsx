import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { cn } from '@shared/lib/cn';
import { NAVIGATION } from '@shared/config/navigation';
import { NavDropdown } from './NavDropdown';
import { NavbarLink } from './NavbarLink';
import { isPathActive } from './lib/navTree';

interface NavbarProps {
  className?: string;
}

/**
 * Горизонтальное меню под шапкой — как в действующем портале
 * (`layoutType: 'horizontal'` в его app.config.ts).
 *
 * Ниже 992px не показывается: там в оригинале вместо навбара включается
 * бургер. Брейкпоинт lg в tailwind.config.ts уже равен 992px — он перенесён
 * из Bootstrap вместе с остальной темой, подгонять не пришлось.
 */
export default function Navbar({ className }: NavbarProps) {
  const { pathname } = useLocation();

  // Открытый раздел верхнего уровня. Строка, а не множество: в горизонтальном
  // меню одновременно раскрыт максимум один.
  const [openKey, setOpenKey] = useState<string | null>(null);
  const navRef = useRef<HTMLElement | null>(null);

  const closeAll = useCallback(() => setOpenKey(null), []);

  // Переход по ссылке закрывает меню через onNavigate, но кнопками «назад» и
  // «вперёд» в браузере оно осталось бы висеть. Приём «правка состояния во
  // время рендера» из документации React — дешевле эффекта, потому что React
  // перезапускает рендер сразу, не показывая промежуточный кадр.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    if (openKey !== null) setOpenKey(null);
  }

  // Клик мимо меню закрывает его. Слушатель вешаем только когда есть что
  // закрывать — постоянно висящий обработчик на документе не нужен.
  useEffect(() => {
    if (openKey === null) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!navRef.current?.contains(event.target as Node)) setOpenKey(null);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [openKey]);

  return (
    <nav
      ref={navRef}
      aria-label="Основная навигация"
      className={cn(
        // $header-navbar-height: 4.375rem — те же 70px, что и у шапки
        'hidden h-header bg-white lg:block',
        className
      )}
    >
      <ul className="mx-auto flex h-full max-w-screen-xxl items-center px-gutter">
        {NAVIGATION.map((item) =>
          item.children ? (
            <NavDropdown
              key={item.key}
              item={item}
              depth={0}
              isOpen={openKey === item.key}
              onOpenChange={(open) => setOpenKey(open ? item.key : null)}
              pathname={pathname}
              onNavigate={closeAll}
            />
          ) : (
            <NavbarLink
              key={item.key}
              item={item}
              isActive={item.path !== undefined && isPathActive(item.path, pathname)}
              depth={0}
              onNavigate={closeAll}
            />
          )
        )}
      </ul>
    </nav>
  );
}
