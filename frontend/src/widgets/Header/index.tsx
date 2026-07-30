import { cn } from '@shared/lib/cn';
import { Logo } from './ui/Logo';
import { UserMenu } from './ui/UserMenu';
import type { HeaderProps } from './Header.types';

/**
 * Верхняя полоса — логотип слева, профиль справа.
 * Соответствует header-nav из горизонтального лейаута портала.
 *
 * Сборка: собственной логики пока нет, поэтому нет и model/. Он появится
 * вместе с меню профиля, когда useAuth переедет на TanStack Query.
 */
export default function Header({ className, showUserMenu = true }: HeaderProps) {
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
      <div className="flex items-center gap-4">
        <Logo />
      </div>

      <div className="flex items-center gap-3">{showUserMenu && <UserMenu />}</div>
    </header>
  );
}
