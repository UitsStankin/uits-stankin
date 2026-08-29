import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';
import { Suspense } from 'react';

// Layouts
import AppLayout from '../layouts/AppLayout';
import AuthLayout from '../layouts/AuthLayout';

import Loader from '@shared/ui/Loader';
import { LOGIN_ROUTE, NEWS_ROUTE, PERSONAL_ROUTE } from '@shared/config/routes';
import Placeholder from '@pages/Placeholder';
import HomePage from '@pages/HomePage';
import LoginPage from '@pages/LoginPage';
import PersonalPage from '@pages/PersonalPage';
import NewsPage from '@pages/NewsPage';
import NewsDetailPage from '@pages/NewsDetailPage';
import ProtectedRoute from './protectedRoute';
import RouteError from './RouteError';

// Ленивая загрузка страниц (аналог loadChildren из Angular)
// const UitsRoutes = lazy(() => import('@pages/uits'));
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
      // Главная. Собирается из трёх кусков: редактируемый блок `home-before`,
      // лента новостей, редактируемый блок `home-after`.
      {
        index: true,
        element: <HomePage />,
        errorElement: <RouteError />,
      },
      // Новости. Публичные: ручка `GET /api/public/news` открыта всем,
      // и лента — то, ради чего на портал заходят без входа.
      //
      // Детальная — вложенным роутом, а не отдельной записью с полным путём:
      // так адрес `/about/news` объявлен один раз, и переименование раздела
      // не оставит детальную страницу на старом пути.
      //
      // `errorElement` — на дочерних роутах, а не на лейауте: роутер рисует
      // его вместо упавшего роута, и на дочернем от лейаута остаются шапка,
      // меню и подвал. Повешенный на лейаут, он унёс бы их вместе со страницей.
      {
        path: NEWS_ROUTE,
        children: [
          { index: true, element: <NewsPage />, errorElement: <RouteError /> },
          { path: ':id', element: <NewsDetailPage />, errorElement: <RouteError /> },
        ],
      },
      // Личный кабинет. Внутри общего лейаута, а не в своём: в оригинале
      // у /corp было боковое меню на два пункта, но второй из них —
      // календарь событий — приедет только в Фазе 3. Меню из одного
      // пункта, дублирующего текущую страницу, показывать незачем;
      // корпоративный лейаут заведём вместе с календарём.
      {
        path: '/corp',
        children: [
          // Голый /corp — раздел, а не страница: как и в оригинале,
          // отправляем на единственную готовую страницу раздела.
          {
            index: true,
            element: <Navigate to={PERSONAL_ROUTE} replace />,
          },
          {
            path: PERSONAL_ROUTE,
            element: (
              <ProtectedRoute>
                <PersonalPage />
              </ProtectedRoute>
            ),
            errorElement: <RouteError />,
          },
        ],
      },
      // 404 намеренно ВНУТРИ лейаута, а не рядом с ним. Пункты меню ведут на
      // ещё не перенесённые страницы, и если ловить их корневым '*', то на
      // первом же клике пропадают и шапка, и сайдбар — уйти можно только
      // кнопкой «назад». Здесь у пользователя остаётся навигация.
      {
        path: '*',
        element: <Placeholder title="Страница ещё не перенесена" />,
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
      // Голый /auth — не страница, а раздел: показывать по нему пустую
      // карточку незачем, отправляем на единственную форму раздела.
      {
        index: true,
        element: <Navigate to={LOGIN_ROUTE} replace />,
      },
      {
        path: LOGIN_ROUTE,
        element: <LoginPage />,
      },
      // Роута /auth/logout нет: выход в контракте не серверный, а локальный —
      // забыть токен и очистить кэш. Это действие кнопки в меню профиля
      // (features/auth/model/useLogout.ts), для него не нужна страница.
    ],
  },
];

export const router = createBrowserRouter(routes);
