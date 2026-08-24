import { Menu } from 'lucide-react';

interface BurgerButtonProps {
  isNavOpen: boolean;
  onClick: () => void;
}

/**
 * Кнопка мобильного меню. Видна только ниже 992px — на десктопе её место
 * занимает горизонтальный навбар.
 *
 * Живёт в шапке, а не в навбаре, как в оригинале: там на узком экране
 * nav-toggle стоит слева в header-nav, а логотип скрывается.
 */
export function BurgerButton({ isNavOpen, onClick }: BurgerButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Открыть меню"
      aria-expanded={isNavOpen}
      className="rounded p-2 text-gray-900 transition-colors hover:bg-gray-200 lg:hidden"
    >
      <Menu size={24} aria-hidden />
    </button>
  );
}
