import { cn } from '@shared/lib/cn';
import { Logo } from '@shared/ui/Logo';
import { useAppStore } from '@shared/store';
import { useAuth } from '@features/auth/lib/useAuth';
import { BurgerButton } from './ui/BurgerButton';
import { LoginLink } from './ui/LoginLink';
import { UserMenu } from './ui/UserMenu';
import { useDropdownState } from './model/useDropdownState';
import { buildProfileMenu } from './lib/profileMenu';
import type { HeaderProps } from './Header.types';

/**
 * Верхняя полоса — логотип слева, вход или профиль справа.
 * Соответствует header-nav из горизонтального лейаута портала.
 */
export default function Header({ className }: HeaderProps) {
  const { profile, canEdit } = useAuth();
  const menu = useDropdownState();
  const isMobileNavOpen = useAppStore((s) => s.isMobileNavOpen);
  const openMobileNav = useAppStore((s) => s.openMobileNav);

  const items = buildProfileMenu({ canManage: canEdit });

  // В оригинале: «Имя Фамилия», а если имени нет — логин. Склейка через
  // filter: в контракте имя и фамилия по отдельности могут быть `null`,
  // и шаблонная строка написала бы в шапке «Demo null».
  const displayName = profile
    ? [profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.username
    : '';

  return (
    <header
      className={cn(
        'h-header',
        'border-b border-default bg-white',
        'flex items-center justify-between',
        'px-gutter',
        'sticky top-0 z-sticky',
        className
      )}
    >
      {/* Как в оригинале: на узком экране слева бургер, а логотип скрыт —
          он показывается внутри выехавшей панели. */}
      <BurgerButton isNavOpen={isMobileNavOpen} onClick={openMobileNav} />
      <Logo className="hidden lg:block" />

      {profile ? (
        <UserMenu
          displayName={displayName}
          email={profile.email}
          avatarUrl={profile.avatar}
          items={items}
          isOpen={menu.isOpen}
          onToggle={menu.toggle}
          onNavigate={menu.close}
          containerRef={menu.containerRef}
        />
      ) : (
        <LoginLink />
      )}
    </header>
  );
}
