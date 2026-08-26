import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';

import { useAuth } from '@features/auth';
import Loader from '@shared/ui/Loader';
import { LOGIN_ROUTE } from '@shared/config/routes';

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Пускает внутрь только вошедших. Первым делом ждёт ответа о профиле.
 *
 * Без ожидания страница ломалась бы ровно там, где нужна больше всего:
 * при перезагрузке токен в хранилище есть, но профиль ещё едет, и по
 * `isAuthenticated === false` вошедшего пользователя выкидывало бы
 * на форму входа на каждый F5.
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <Loader />;

  if (!isAuthenticated) {
    // Куда шли — в state: после входа вернём именно сюда, а не на главную.
    return <Navigate to={LOGIN_ROUTE} state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
