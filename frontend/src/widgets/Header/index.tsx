import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router';
import { ArrowUpRight } from 'lucide-react';

import { NAVIGATION } from '@shared/config/navigation';
import { HOME_ROUTE } from '@shared/config/routes';
import { cn } from '@shared/lib/cn';
import { Logo } from '@shared/ui/Logo';
import { useAuth, useLogout } from '@features/auth/session';
import { LoginLink } from './ui/LoginLink';
import { MenuButton } from './ui/MenuButton';
import { MenuSheet } from './ui/MenuSheet';
import { SessionSkeleton } from './ui/SessionSkeleton';
import { ThemeToggle } from './ui/ThemeToggle';
import { UserMenu } from './ui/UserMenu';
import { useDropdownState } from './model/useDropdownState';
import { useMenuSheet } from './model/useMenuSheet';
import { buildMenuGroups } from './lib/menuGroups';
import { buildProfileMenu } from './lib/profileMenu';
import type { HeaderProps } from './Header.types';

const SCROLLED_AFTER_PX = 24;
const NAVIGATION_TIMEOUT_MS = 4000;

const MENU_GROUPS = buildMenuGroups(NAVIGATION);

/**
 * Верхняя полоса: логотип с подписью кафедры слева, справа вход или профиль,
 * переключатель темы (кроме админки) и кнопка меню разделов.
 *
 * Сами разделы живут в листе меню, который открывает кнопка: горизонтального
 * навбара больше нет.
 */
export default function Header({
  className,
  overlay = false,
  showThemeToggle = false,
  admin = false,
}: HeaderProps) {
  const { pathname } = useLocation();
  const { profile, canEdit, isLoading } = useAuth();
  const logout = useLogout();
  const profileMenu = useDropdownState();
  const menu = useMenuSheet();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const header = headerRef.current;
    if (!overlay || !header) return;

    let frame = 0;
    let scrolled: boolean | null = null;
    const update = () => {
      frame = 0;
      const next = window.scrollY > SCROLLED_AFTER_PX;
      if (next === scrolled) return;
      scrolled = next;
      header.dataset.scrolled = String(next);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, [overlay]);

  const items = buildProfileMenu({ canManage: canEdit }).filter(
    (item) => !admin || item.key !== 'admin',
  );

  // Имя и фамилия в контракте по отдельности могут быть `null`; склейка
  // через filter не напишет в шапке «Demo null». Нет обоих — логин.
  const displayName = profile
    ? [profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.username
    : '';

  const closeMenu = () => {
    menu.close();
    menuButtonRef.current?.focus();
  };

  const pendingPath = useRef<string | null>(null);
  const navigateFromMenu = (path: string) => {
    if (path === pathname) {
      closeMenu();
      return;
    }
    pendingPath.current = path;
    window.setTimeout(() => {
      if (pendingPath.current !== path) return;
      pendingPath.current = null;
      closeMenu();
    }, NAVIGATION_TIMEOUT_MS);
  };

  useEffect(() => {
    if (pendingPath.current === null || pathname !== pendingPath.current) return;
    pendingPath.current = null;
    closeMenu();
  }, [pathname]);

  const isGuest = !profile && !isLoading;

  return (
    <>
      <header
        ref={headerRef}
        className={cn(
          'u-top',
          overlay ? 'u-top--overlay' : 'u-top--flow',
          admin && 'u-top--admin',
          className,
        )}
      >
        <div className={cn('u-top-row', admin ? 'u-top-row--admin' : 'u-wrap')}>
          {admin ? (
            <div className="u-top-brand">
              <Logo />
              <span className="u-top-tag">Управление сайтом</span>
            </div>
          ) : (
            <Logo withDescriptor />
          )}

          <div className="u-top-actions">
            {admin && (
              <Link to={HOME_ROUTE} className="u-btn-ghost u-nw u-top-site">
                На сайт
                <ArrowUpRight size={16} aria-hidden />
              </Link>
            )}

            {/* Три состояния, а не два: «вошёл», «ещё не знаем» и «не вошёл».
                Среднее — это первые миллисекунды после перезагрузки страницы
                с сохранённым токеном. */}
            {profile ? (
              <UserMenu
                displayName={displayName}
                email={profile.email}
                avatarUrl={profile.avatarUrl}
                items={items}
                isOpen={profileMenu.isOpen}
                onToggle={profileMenu.toggle}
                onNavigate={profileMenu.close}
                onLogout={logout}
                containerRef={profileMenu.containerRef}
              />
            ) : isLoading ? (
              <SessionSkeleton />
            ) : (
              <LoginLink className="u-hide-sm" />
            )}

            {showThemeToggle && <ThemeToggle />}

            {!admin && (
              <MenuButton isOpen={menu.isOpen} onClick={menu.open} buttonRef={menuButtonRef} />
            )}
          </div>
        </div>
      </header>

      {!admin && menu.isOpen && (
        <MenuSheet
          groups={MENU_GROUPS}
          pathname={pathname}
          isClosing={menu.isClosing}
          onClose={closeMenu}
          onNavigate={navigateFromMenu}
          footer={isGuest ? <LoginLink onClick={menu.close} /> : null}
        />
      )}
    </>
  );
}
