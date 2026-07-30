import { cn } from '@shared/lib/cn';

interface LogoProps {
  className?: string;
}

/**
 * Логотип в шапке.
 *
 * ЗАГЛУШКА: у портала здесь эмблема УИТС. В public/assets/images/logo/
 * лежат четыре варианта (обычный и белый, полный и свёрнутый) плюс
 * отдельно UITS.png — какой основной, надо выбрать. Меняется в части
 * каркаса про шапку.
 */
export function Logo({ className }: LogoProps) {
  return <div className={cn('font-bold text-text-heading', className)}>MyApp</div>;
}
