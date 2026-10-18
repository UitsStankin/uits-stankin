import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router';

import { cn } from '@shared/lib/cn';

type Variant = 'primary' | 'light';

const VARIANT_CLASS: Record<Variant, string> = {
  primary: 'u-btn',
  light: 'u-btn-light',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: ReactNode;
}

/** Кнопка бренда: скруглённая, без анимации текста — только смена цвета при наведении. */
export function Button({
  children,
  variant = 'primary',
  icon,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button {...rest} type={type} className={cn(VARIANT_CLASS[variant], className)}>
      {children}
      {icon}
    </button>
  );
}

interface ButtonLinkProps {
  children: ReactNode;
  to: string;
  variant?: Variant;
  icon?: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function ButtonLink({
  children,
  to,
  variant = 'light',
  icon,
  className,
  onClick,
}: ButtonLinkProps) {
  return (
    <Link to={to} className={cn(VARIANT_CLASS[variant], className)} onClick={onClick}>
      {children}
      {icon}
    </Link>
  );
}
