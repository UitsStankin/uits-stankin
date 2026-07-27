import { createBrowserRouter, type RouteObject } from 'react-router';
import { Suspense } from 'react';

// Layouts
import AppLayout from '../layouts/AppLayout';
import AuthLayout from '../layouts/AuthLayout';

import Loader from '@shared/ui/Loader';
import Placeholder from '@pages/Placeholder';

// Ленивая загрузка страниц (аналог loadChildren из Angular)
// const UitsRoutes = lazy(() => import('@pages/uits'));
// const AuthRoutes = lazy(() => import('@pages/auth'));
// const ErrorsRoutes = lazy(() => import('@pages/errors'));

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
        index: true,
        element: <Placeholder title="Главная — страница ещё не перенесена" />,
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
        index: true,
        element: <Placeholder title="Вход — страница ещё не перенесена" />,
      },
    ],
  },
  // === ERRORS (Wildcard) ===
  {
    path: '*',
    element: <Placeholder title="404 — страница не найдена" />,
  },
];

export const router = createBrowserRouter(routes);
