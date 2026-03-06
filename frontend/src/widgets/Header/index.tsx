import { cn } from '@/shared/lib/cn';
import type { HeaderProps } from './Header.types';

export default function Header({ 
  onToggleSidebar, 
  isSidebarCollapsed,
  className,
  showUserMenu = true 
}: HeaderProps) {
  return (
    <header className={cn(
      'h-header',
      'bg-white border-b border-default',
      'flex items-center justify-between',
      'px-gutter',
      'sticky top-0 z-sticky',
      className
    )}>
      {/* Левая часть */}
      <div className="flex items-center gap-4">
        {/* Кнопка гамбургера (только мобильные) */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className={cn(
              'md:hidden p-2 rounded hover:bg-gray-200',
              'text-text-default transition-colors'
            )}
            aria-label="Toggle sidebar"
          >
            <HamburgerIcon collapsed={isSidebarCollapsed} />
          </button>
        )}
        
        {/* Логотип */}
        <Logo variant={isSidebarCollapsed ? 'icon' : 'full'} />
      </div>

      {/* Правая часть */}
      <div className="flex items-center gap-3">
        {showUserMenu && <UserProfileMenu />}
      </div>
    </header>
  );
}

// === Внутренние компоненты ===

function HamburgerIcon({ collapsed }: { collapsed?: boolean }) {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {collapsed ? (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      )}
    </svg>
  );
}

function Logo({ variant }: { variant: 'icon' | 'full' }) {
  return (
    <div className="font-bold text-text-heading">
      {variant === 'icon' ? 'M' : 'MyApp'}
    </div>
  );
}

function UserProfileMenu() {
  // Заглушка — здесь будет реальный компонент с аватаром и дропдауном
  return (
    <button className="flex items-center gap-2 p-1 rounded hover:bg-gray-100">
      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-medium">
        U
      </div>
    </button>
  );
}