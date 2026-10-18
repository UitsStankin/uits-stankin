import { useEffect } from 'react';
import { Outlet, ScrollRestoration, useLocation } from 'react-router';
import { cn } from '@/shared/lib/cn';
import { ADMIN_ROUTE, HOME_ROUTE } from '@shared/config/routes';
import { startSmoothScroll } from '@shared/lib/smoothScroll';
import { useDocumentTheme } from '@shared/lib/useDocumentTheme';
import Header from '@widgets/Header';
import Footer from '@widgets/Footer';
import type { AppLayoutProps } from './AppLayout.types';

/**
 * Главный лейаут приложения: шапка с листом меню, содержимое, подвал.
 *
 * Тема (светлая или тёмная), токены и контейнер нового дизайна действуют
 * на всём портале, кроме админки: её экраны собраны под светлую палитру
 * и своё поле отступов, поэтому там тема всегда светлая, переключателя
 * в шапке нет, а цвета и скругления остаются прежними.
 *
 * Плавная прокрутка и шапка поверх первого экрана — только на главной.
 */
export default function AppLayout({ className }: AppLayoutProps) {
  const { pathname } = useLocation();
  const isHome = pathname === HOME_ROUTE;
  const isAdmin = pathname === ADMIN_ROUTE || pathname.startsWith(`${ADMIN_ROUTE}/`);

  useDocumentTheme(!isAdmin);

  useEffect(() => (isHome ? startSmoothScroll() : undefined), [isHome]);

  return (
    <div
      className={cn(
        'u-site flex min-h-screen flex-col',
        isAdmin ? 'bg-background-default text-text-default' : 'u-themed',
        isHome && 'u-site--home',
        className
      )}
    >
      <a className="u-skip" href="#main">
        К содержимому
      </a>

      <Header overlay={isHome} showThemeToggle={!isAdmin} />

      {/* flex-1 прижимает подвал к низу на коротких страницах — иначе он
          висел бы посреди экрана. */}
      <main
        id="main"
        className={cn(
          'flex-1',
          isAdmin && 'p-gutter-sm md:p-gutter lg:p-[1.875rem]',
          !isAdmin && !isHome && 'u-wrap u-page'
        )}
      >
        {/* Аналог <router-outlet> */}
        <Outlet />
      </main>

      <Footer />

      {/* Восстановление прокрутки. Роутер данных сам этого не делает: без
          компонента переход по ссылке сохраняет позицию скролла, и клик
          по карточке из середины ленты открывал бы статью с середины,
          а возврат «назад» бросал бы читателя в начало списка вместо того
          места, откуда он ушёл.

          Стоит на лейауте, а не на странице: касается всех страниц разом,
          и заводить его на каждой — значит однажды забыть. */}
      <ScrollRestoration />
    </div>
  );
}
