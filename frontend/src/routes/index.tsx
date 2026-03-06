import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { lazy, Suspense } from 'react';

// Layouts
import AppLayout from '../layouts/AppLAayout';
import AuthLayout from '../layouts/AuthLayout';

// Guards
import ProtectedRoute from './protectedRoute';

// Заглушка загрузки
const Loader = () => <div className="loader">Загрузка...</div>;

// Ленивая загрузка фич (аналог loadChildren)
// const UitsRoutes = lazy(() => import('../features/uits/routes'));
// const AuthRoutes = lazy(() => import('../features/auth/routes'));
// const ErrorsRoutes = lazy(() => import('../features/errors/routes'));

// Базовые роуты
export const routes: RouteObject[] = [
  {
    path: '/',
    element: (
      <Suspense fallback={<Loader />}>
        <AppLayout />
      </Suspense>
    ),
    children: [
      // === APP_LAYOUT_ROUTES (UitsModule) ===
      {
        path: '',
        element: (
          <Suspense fallback={<Loader />}>
            {/* <ProtectedRoute>
              <UitsRoutes />
            </ProtectedRoute> */}
          </Suspense>
        ),
      },
    ],
  },
  {
    path: '/auth',
    element: (
      <Suspense fallback={<Loader />}>
        <AuthLayout />
      </Suspense>
    ),
    children: [
      // === AUTH_LAYOUT_ROUTES (AuthModule) ===
      {
        path: '',
        // element: <AuthRoutes />,
      },
    ],
  },
  // === ERRORS (Wildcard) ===
  {
    path: '*',
    element: (
      <Suspense fallback={<Loader />}>
        {/* <ErrorsRoutes /> */}
      </Suspense>
    ),
  },
];

export const router = createBrowserRouter(routes);