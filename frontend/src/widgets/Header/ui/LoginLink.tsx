import { Link } from 'react-router';

import { LOGIN_ROUTE } from '@shared/config/routes';
import { cn } from '@shared/lib/cn';

interface LoginLinkProps {
  className?: string;
  onClick?: () => void;
}

export function LoginLink({ className, onClick }: LoginLinkProps) {
  return (
    <Link to={LOGIN_ROUTE} onClick={onClick} className={cn('u-btn-ghost u-nw', className)}>
      Вход для персонала
    </Link>
  );
}
