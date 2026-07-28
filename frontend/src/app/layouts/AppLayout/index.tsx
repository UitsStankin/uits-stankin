import { Outlet } from 'react-router';
import { cn } from '@/shared/lib/cn';
import Header from '@widgets/Header';
import Navbar from '@widgets/Navbar';
import type { AppLayoutProps } from './AppLayout.types';

/**
 * Главный лейаут приложения — горизонтальный, как в действующем портале.
 *
 * Раскладка повторяет horizontal-layout из Angular:
 *   header-nav      логотип слева, вход справа
 *   header-navbar   горизонтальное меню          <- ниже 992px скрыто
 *   content
 *
 * Сайдбар убран. Он достался от заготовки шаблона Espire, а портал работает
 * на `layoutType: 'horizontal'` — вертикальное меню там не используется.
 * Вместе с ним ушли LAYOUT_WIDTHS, CONTENT_MARGINS и компактный режим.
 */
export default function AppLayout({ className }: AppLayoutProps) {
  return (
    <div
      className={cn(
        'flex min-h-screen flex-col',
        'bg-background-default',
        'text-text-default',
        'font-sans',
        className
      )}
    >
      <Header className="h-header border-b border-default" />

      <Navbar className="border-b border-default" />

      <main className="flex-1 p-gutter-sm md:p-gutter lg:p-[1.875rem]">
        {/* Аналог <router-outlet> */}
        <Outlet />
      </main>
    </div>
  );
}
