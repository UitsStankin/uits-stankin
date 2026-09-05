import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';
import { Suspense } from 'react';

// Layouts
import AppLayout from '../layouts/AppLayout';
import AuthLayout from '../layouts/AuthLayout';

import Loader from '@shared/ui/Loader';
import {
  ACHIEVEMENTS_ROUTE,
  ANNOUNCEMENTS_ROUTE,
  CONFERENCES_ROUTE,
  HELPERS_ROUTE,
  LOGIN_ROUTE,
  NEWS_ROUTE,
  PERSONAL_ROUTE,
  TEACHERS_ROUTE,
} from '@shared/config/routes';
import Placeholder from '@pages/Placeholder';
import HomePage from '@pages/HomePage';
import HistoryPage from '@pages/HistoryPage';
import LoginPage from '@pages/LoginPage';
import PersonalPage from '@pages/PersonalPage';
import NewsPage from '@pages/NewsPage';
import NewsDetailPage from '@pages/NewsDetailPage';
import AnnouncementsPage from '@pages/AnnouncementsPage';
import TeachersPage from '@pages/TeachersPage';
import TeacherDetailPage from '@pages/TeacherDetailPage';
import HelpersPage from '@pages/HelpersPage';
import ConferencesPage from '@pages/ConferencesPage';
import ConferenceDetailPage from '@pages/ConferenceDetailPage';
import AchievementsPage from '@pages/AchievementsPage';
import AchievementDetailPage from '@pages/AchievementDetailPage';
import EditablePagePage from '@pages/EditablePagePage';
import type { EditablePageSlug } from '@shared/types';
import ProtectedRoute from './protectedRoute';
import RouteError from './RouteError';

// Ленивая загрузка страниц (аналог loadChildren из Angular)
// const UitsRoutes = lazy(() => import('@pages/uits'));
// const ErrorsRoutes = lazy(() => import('@pages/errors'));

/**
 * Редактируемые разделы: адрес → слаг раздела и заголовок страницы.
 *
 * Девять из тринадцати. У `home-before` и `home-after` собственного адреса
 * нет по контракту — их рисует главная. Контакты и аспирантура ждут свои
 * страницы (F-32, F-34): в оригинале вокруг их редактируемых блоков была
 * своя вёрстка — карта с соцсетями и таблица аспирантов.
 *
 * Адреса взяты из меню (`shared/config/navigation.ts`) и повторяют старый
 * портал. Заголовки — формулировки подписей из сида
 * `008-seed-editable-pages`, чтобы посетитель и модератор называли раздел
 * одинаково; сам `title` из ответа страница не рисует — контракт называет
 * его подписью для списка в админке, и в перенесённых строках он бывает
 * `null`.
 *
 * Обобщённого роута `/page/:slug` из оригинала нет намеренно: там на него
 * не вела ни одна ссылка, здесь он дал бы каждому разделу второй адрес —
 * дубль для поисковика, тот самый, от которого F-20 уходил у записей.
 * Слаг захардкожен здесь, а не разбирается из адреса: опечатка в нём —
 * ошибка компиляции по `EditablePageSlug`, а не рантаймовый `404`.
 */
const EDITABLE_PAGES: ReadonlyArray<{
  path: string;
  slug: EditablePageSlug;
  heading: string;
}> = [
  {
    path: '/about/fields-of-study',
    slug: 'fields-of-study',
    heading: 'Направления подготовки',
  },
  {
    path: '/about/documents/department',
    slug: 'documents-department',
    heading: 'Нормативные документы кафедры',
  },
  {
    path: '/about/documents/university',
    slug: 'documents-university',
    heading: 'Нормативные документы университета',
  },
  {
    path: '/educational-activities/bachelor/edu-plans',
    slug: 'bachelor-edu-plans',
    heading: 'Бакалавриат: учебные планы',
  },
  {
    path: '/educational-activities/bachelor/graduate',
    slug: 'bachelor-graduate',
    heading: 'Бакалавриат: защита ВКР',
  },
  {
    path: '/educational-activities/bachelor/practices',
    slug: 'bachelor-practices',
    heading: 'Бакалавриат: практики',
  },
  {
    path: '/educational-activities/master/edu-plans',
    slug: 'master-edu-plans',
    heading: 'Магистратура: учебные планы',
  },
  {
    path: '/educational-activities/master/graduate',
    slug: 'master-graduate',
    heading: 'Магистратура: защита ВКР',
  },
  {
    path: '/educational-activities/master/practices',
    slug: 'master-practices',
    heading: 'Магистратура: практики',
  },
];

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
      // История кафедры. Статическая: ручки нет и не будет, содержимое лежит
      // в коде страницы. Адрес взят из меню (`shared/config/navigation.ts`,
      // пункт `about/history`) и повторяет старый портал — как и остальные
      // перенесённые разделы, это экономит строку в карте редиректов nginx
      // при переезде.
      //
      // Строкой здесь, а не константой в `shared/config/routes.ts`: адрес
      // знает один роутер. В меню он лежит своей записью, как у всех
      // разделов, а больше собирать его некому — ссылок на историю
      // из кода нет.
      //
      // `errorElement` — по той же причине, что у соседей: без него падение
      // страницы унесло бы шапку с меню, и уйти можно было бы только «назад».
      {
        path: '/about/history-of-department',
        element: <HistoryPage />,
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
      // Объявления. Та же лента с другим `postType`; детальной страницы
      // у раздела нет намеренно — адрес записи один на оба раздела
      // (`shared/config/routes.ts`).
      {
        path: ANNOUNCEMENTS_ROUTE,
        element: <AnnouncementsPage />,
        errorElement: <RouteError />,
      },
      // Преподаватели. Публичные: ручки `GET /api/public/teachers` открыты
      // всем. Карточка — вложенным роутом по тем же причинам, что у новостей:
      // адрес раздела объявлен один раз, и переименование не оставит
      // карточку на старом пути.
      {
        path: TEACHERS_ROUTE,
        children: [
          { index: true, element: <TeachersPage />, errorElement: <RouteError /> },
          { path: ':id', element: <TeacherDetailPage />, errorElement: <RouteError /> },
        ],
      },
      // УВП. Публичный: ручка `GET /api/public/helpers` открыта всем.
      // Детальной страницы нет намеренно, поэтому и вложенных роутов нет:
      // карточка целиком помещается в элементе списка, а публичная ручка
      // одной карточки обслуживает форму правки (блок 4), не посетителя.
      {
        path: HELPERS_ROUTE,
        element: <HelpersPage />,
        errorElement: <RouteError />,
      },
      // Конференции. Публичные: ручка `GET /api/public/conferences` открыта
      // всем. Детальная — вложенным роутом по тем же причинам, что у новостей:
      // адрес раздела объявлен один раз, и переименование не оставит
      // детальную страницу на старом пути.
      {
        path: CONFERENCES_ROUTE,
        children: [
          { index: true, element: <ConferencesPage />, errorElement: <RouteError /> },
          { path: ':id', element: <ConferenceDetailPage />, errorElement: <RouteError /> },
        ],
      },
      // Достижения кафедры. Публичные: ручка `GET /api/public/achievements`
      // открыта всем. Детальная — вложенным роутом по тем же причинам,
      // что у новостей: адрес раздела объявлен один раз, и переименование
      // не оставит детальную страницу на старом пути. Отдельного роута
      // «достижения преподавателя» нет намеренно: та ручка рисует блок
      // на карточке ППС, а сами достижения открываются здесь же (F-25).
      {
        path: ACHIEVEMENTS_ROUTE,
        children: [
          { index: true, element: <AchievementsPage />, errorElement: <RouteError /> },
          { path: ':id', element: <AchievementDetailPage />, errorElement: <RouteError /> },
        ],
      },
      // Редактируемые разделы. Публичные: ручка `GET /api/public/pages/{slug}`
      // открыта всем. Одна страница на девять адресов — разделы отличаются
      // только слагом и заголовком, оба лежат в таблице выше.
      ...EDITABLE_PAGES.map(({ path, slug, heading }) => ({
        path,
        element: <EditablePagePage slug={slug} heading={heading} />,
        errorElement: <RouteError />,
      })),
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
