import { cn } from '@shared/lib/cn';

interface LogoProps {
  className?: string;
}

/**
 * Логотип в шапке.
 *
 * ЗАГЛУШКА: у портала здесь «УИТС». Меняется в части каркаса про шапку.
 *
 * Единственный настоящий логотип кафедры — public/assets/images/UITS.png,
 * но в шапку высотой 70px он не годится: 3177x2160 и подпись
 * «Управление и информатика в технических системах» в две строки капслоком.
 * На действующем сайте по той же причине стоит текстовое «УИТС», эмблема
 * пойдёт в favicon.
 */
export function Logo({ className }: LogoProps) {
  return <div className={cn('font-bold text-text-heading', className)}>MyApp</div>;
}
