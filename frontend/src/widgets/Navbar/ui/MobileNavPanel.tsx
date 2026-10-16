import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@shared/lib/cn';
import { Logo } from '@shared/ui/Logo';

interface MobileNavPanelProps {
  isOpen: boolean;
  onClose: () => void;
  /** Пункты меню. Дерево собирает index.tsx. */
  children: ReactNode;
}

/**
 * Выезжающая слева панель с меню — то же, что mobile-nav в оригинале.
 *
 * Размеры оттуда же: $mobile-nav-width 17.5rem, выезд из left: -17.5rem
 * в left: 0 за 0.3s ease, затемнение фона rgba(black, .5).
 *
 * Кнопка-бургер здесь не рендерится: в оригинале nav-toggle стоит в шапке
 * слева, а логотип на узком экране скрывается. Открывается панель из Header
 * через общий стор.
 *
 * Чистый: состоянием панели управляет вызывающий.
 */
export function MobileNavPanel({ isOpen, onClose, children }: MobileNavPanelProps) {
  return (
    <>
      {/* Затемнение под панелью. Рендерится только когда открыто, иначе
          перехватывало бы клики по странице. */}
      {isOpen && (
        <div
          className="fixed inset-0 z-modal bg-black/50"
          onClick={onClose}
          aria-hidden
        />
      )}

      {/* Панель в DOM всегда — иначе не с чего анимировать выезд.
          Скрытая убрана из дерева доступности и не ловит фокус. */}
      <div
        className={cn(
          'fixed top-0 left-0 z-modal h-full w-[17.5rem] bg-white',
          'transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-hidden={!isOpen}
        inert={!isOpen}
      >
        <div className="flex h-header items-center justify-between px-5">
          <Logo />
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть меню"
            className="rounded p-2 text-gray-900 transition-colors hover:bg-gray-200"
          >
            <ArrowLeft size={20} aria-hidden />
          </button>
        </div>

        <nav
          aria-label="Основная навигация"
          className="h-[calc(100%-4.375rem)] overflow-y-auto px-2 pb-4"
        >
          <ul className="space-y-0.5">{children}</ul>
        </nav>
      </div>
    </>
  );
}
