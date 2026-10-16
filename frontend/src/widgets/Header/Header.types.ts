export interface HeaderProps {
  className?: string;
  showUserMenu?: boolean;
}

/*
 * Убраны onToggleSidebar и isSidebarCollapsed: сайдбара больше нет, портал
 * работает на горизонтальном меню. Гамбургер, который они включали, не
 * рендерился вовсе — AppLayout эти пропсы не передавал. Кнопка вернётся
 * в части про мобильное меню, но управлять будет им, а не сайдбаром.
 *
 * HeaderUser убран как неиспользуемый: форма профиля описана в
 * shared/types/auth.types.ts, второе описание того же — рассинхрон.
 */
