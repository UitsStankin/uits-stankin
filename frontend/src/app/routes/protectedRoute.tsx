import { Navigate, useLocation } from 'react-router';
import { useAuth } from '@features/auth/lib/useAuth'; // Ваш хук проверки авторизации

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // Редирект на логин с сохранением текущего пути
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}