import { Link } from 'react-router';
import { cn } from '@shared/lib/cn';

interface LogoProps {
  className?: string;
  withDescriptor?: boolean;
}

export function Logo({ className, withDescriptor = false }: LogoProps) {
  return (
    <Link
      to="/"
      aria-label="Кафедра УИТС, МГТУ «СТАНКИН» — на главную"
      className={cn('u-logo', className)}
    >
      <img
        className="u-logo-img u-logo-on-dark"
        src="/img/brand/stankin-logo-white.svg"
        alt=""
        width={120}
        height={36}
      />
      <img
        className="u-logo-img u-logo-on-light"
        src="/img/brand/stankin-logo-color.svg"
        alt=""
        width={120}
        height={36}
      />
      {withDescriptor && (
        <span className="u-logo-desc" aria-hidden>
          <span className="u-desc-long">
            Кафедра управления и информатики
            <br />в технических системах
          </span>
          <span className="u-desc-short">Кафедра УИТС</span>
        </span>
      )}
    </Link>
  );
}
