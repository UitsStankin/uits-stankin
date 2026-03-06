import { Outlet } from 'react-router-dom';
import { cn } from '@/shared/lib/cn';
import { useAppStore, selectLayout } from '@/shared/store/appStore';
import { LAYOUT_WIDTHS, CONTENT_MARGINS } from '@/shared/store/appStore.constants';
import Header from '../../widgets/Header';
// import Sidebar from '../../widgets/Sidebar';
import type { AppLayoutProps, AppLayoutComputed } from './AppLayout.types';

/**
 * Главный лейаут приложения
 * Аналог AppLayoutComponent из Angular
 */
export default function AppLayout({ 
  onSidebarToggle, 
  className 
}: AppLayoutProps) {
  // === Селекторы из store (аналог @Select) ===
  const layout = useAppStore(selectLayout);
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);

  // === Вычисляемые значения (выносим из JSX для чистоты) ===
  const computed: AppLayoutComputed = {
    sidebarWidthClass: LAYOUT_WIDTHS[layout],
    contentMarginClass: CONTENT_MARGINS[layout],
    isSidebarCollapsed: layout === 'compact',
  };

  // === Обработчики ===
  const handleSidebarToggle = () => {
    toggleSidebar();
    onSidebarToggle?.(computed.isSidebarCollapsed);
  };

  return (
    <div className={cn(
      // Базовые стили
      'flex flex-col min-h-screen',
      'bg-background-default',
      'text-text-default', 
      'font-sans',
      // Пользовательские классы
      className
    )}>
      {/* === HEADER === */}
      <Header 
        onToggleSidebar={handleSidebarToggle}
        isSidebarCollapsed={computed.isSidebarCollapsed}
        className="h-header border-b border-default"
      />

      <div className="flex flex-1 overflow-hidden">
        {/* === SIDEBAR === */}
        <aside className={cn(
          'bg-white border-r border-default',
          'transition-all duration-200 ease-in-out',
          'hidden md:block',
          computed.sidebarWidthClass,
          'overflow-y-auto'
        )}>
          {/* <Sidebar 
            layoutType={layout} 
            isCollapsed={computed.isSidebarCollapsed}
          /> */}
        </aside>

        {/* === MAIN CONTENT === */}
        <main className={cn(
          'flex-1 overflow-y-auto',
          // Паддинги из дизайн-системы
          'p-gutter-sm md:p-gutter lg:p-[1.875rem]',
          // Отступ под сайдбар на десктопе
          'md:ml-0',
          computed.contentMarginClass
        )}>
          {/* Аналог <router-outlet> */}
          <Outlet />
        </main>
      </div>
    </div>
  );
}