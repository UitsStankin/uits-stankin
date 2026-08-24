import { cn } from '@shared/lib/cn';
import { useAuth } from '@features/auth/lib/useAuth';
import { Logo } from './ui/Logo';
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
  const { profile, isAuthenticated, canEdit } = useAuth();
  const menu = useDropdownState();

  const items = buildProfileMenu({ canManage: canEdit });

  // В оригинале: «Имя Фамилия», а если имени нет — логин.
  const displayName = profile.firstName
    ? `${profile.firstName} ${profile.lastName}`.trim()
    : profile.username;

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
      <Logo />

      {isAuthenticated ? (
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
