import { Link } from 'react-router';

import { LOGIN_ROUTE } from '@shared/config/routes';

/**
 * Ссылка входа для неавторизованных. Текст и адрес — как в оригинале
 * (nav-profile, шаблон #login).
 */
export function LoginLink() {
  return (
    <Link
      to={LOGIN_ROUTE}
      className="text-sm text-gray-900 transition-colors hover:text-primary"
    >
      Вход для персонала
    </Link>
  );
}
