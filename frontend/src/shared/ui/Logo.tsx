import { Link } from 'react-router';
import { cn } from '@shared/lib/cn';

interface LogoProps {
  className?: string;
}

/**
 * Логотип в шапке — текстовое «УИТС», как на действующем сайте.
 *
 * Эмблема кафедры (public/assets/images/UITS.png) сюда не годится:
 * 3177x2160, а высота шапки 70px — подпись «Управление и информатика
 * в технических системах» в две строки капслоком там нечитаема.
 * На портале по той же причине стоит текст. Эмблема пойдёт в favicon.
 */
export function Logo({ className }: LogoProps) {
  return (
    <Link
      to="/"
      aria-label="УИТС — на главную"
      className={cn(
        'text-2xl font-bold tracking-tight text-primary transition-colors hover:text-indigo',
        className
      )}
    >
      УИТС
    </Link>
  );
}
