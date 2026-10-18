import { Outlet } from 'react-router';
import { cn } from '@/shared/lib/cn';
import { BRAND_COLORS } from '@shared/config/brandColors';
import { useDocumentTheme } from '@shared/lib/useDocumentTheme';
import { BrandPattern } from '@shared/ui/brand/BrandPattern';
import { Logo } from '@shared/ui/Logo';
import type { AuthLayoutProps } from './AuthLayout.types';

const AUTH_PATTERN_SEED = 2024;

/**
 * Каркас формы входа: карточка по центру на светлом поле с узором бренда.
 *
 * Тема и токены те же, что у остального портала, — вход не должен выглядеть
 * чужим сайтом. Шапки и подвала нет намеренно: у посетителя одна задача.
 */
export default function AuthLayout({ className }: AuthLayoutProps) {
  useDocumentTheme(true);

  return (
    <div
      className={cn(
        'u-site u-themed relative flex min-h-screen w-full items-center justify-center overflow-hidden p-gutter-sm',
        className
      )}
    >
      <BrandPattern
        className="pointer-events-none absolute -right-48 -top-48 h-[52rem] w-[52rem] opacity-40"
        seed={AUTH_PATTERN_SEED}
        colors={BRAND_COLORS}
      />

      <div className="relative flex w-full max-w-md flex-col gap-8">
        <Logo withDescriptor />

        <div className="animate-fade-in-up rounded-lg bg-surface p-6 shadow-md md:p-10">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
