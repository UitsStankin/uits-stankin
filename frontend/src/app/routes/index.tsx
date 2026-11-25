import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';
import { Suspense } from 'react';

// Layouts
import AppLayout from '../layouts/AppLayout';
import AuthLayout from '../layouts/AuthLayout';

import Loader from '@shared/ui/Loader';
import {
  ACHIEVEMENTS_ROUTE,
  ADMIN_PAGES_ROUTE,
  ADMIN_GRADESHEETS_ROUTE,
  ADMIN_POSTGRADUATES_ROUTE,
  ADMIN_ROUTE,
  ADMIN_TEACHERS_ROUTE,
  ANNOUNCEMENTS_ROUTE,
  CONFERENCES_ROUTE,
  EXAM_SCHEDULE_ROUTE,
  HELPERS_ROUTE,
  HOME_ROUTE,
  LOGIN_ROUTE,
  NEWS_ROUTE,
  PARTNERS_ROUTE,
  CALENDAR_ROUTE,
  PERSONAL_ROUTE,
  POSTGRADUATE_ROUTE,
  PUBLICATIONS_ROUTE,
  PUBLICATION_MANAGE_ROUTE,
  PUBLICATION_NEW_ROUTE,
  PUBLICATION_SCHOLAR_ROUTE,
  PUBLICATION_TAGS_ROUTE,
  publicationEditRoute,
  publicationRoute,
  SCHEDULE_SUMMARY_ROUTE,
  TEACHERS_ROUTE,
} from '@shared/config/routes';
import { ADMIN_SECTIONS } from '@shared/config/adminNavigation';
import NotFoundPage from '@pages/NotFoundPage';
import PartnersPage from '@pages/PartnersPage';
import PublicationsPage, { PublicationDetailPage } from '@pages/PublicationsPage';
import HomePage from '@pages/HomePage';
import HistoryPage from '@pages/HistoryPage';
import ContactsPage from '@pages/ContactsPage';
import ContributorsPage from '@pages/ContributorsPage';
import PostgraduatePage from '@pages/PostgraduatePage';
import LoginPage from '@pages/LoginPage';
import PersonalPage from '@pages/PersonalPage';
import CalendarPage from '@pages/CalendarPage';
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
import ExamSchedulePage from '@pages/ExamSchedulePage';
import ScheduleSummaryPage from '@pages/ScheduleSummaryPage';
import type { EditablePageSlug } from '@shared/types';
import AdminLayout from '../layouts/AdminLayout';
import CorpLayout from '../layouts/CorpLayout';
import UnknownSectionPage from '@pages/admin/UnknownSectionPage';
import ProtectedRoute from './protectedRoute';
import RoleRoute from './RoleRoute';
import RouteError from './RouteError';
import { GradesheetPage } from './GradesheetRoutes';
import LegacyRedirect from './LegacyRedirect';

import {
  AdminHomePage,
  AdminSectionScreen,
  EditablePageFormPage,
  PostgraduateFormPage,
  PublicationEditorPage,
  PublicationScholarPage,
  PublicationTagsPage,
  TeacherFormPage,
} from './LazyScreens';

/**
 * Редактируемые разделы: адрес → слаг раздела и заголовок страницы.
 *
 * Девять из тринадцати. У `home-before` и `home-after` собственного адреса
 * нет по контракту — их рисует главная. Контакты (F-32) и аспирантура
 * (F-34) стоят отдельными записями ниже: в оригинале вокруг их
 * редактируемых блоков была своя вёрстка — карта с соцсетями и таблица
 * аспирантов, — и парой «слаг + заголовок» такая страница не описывается.
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

/**
 * Адрес внутри админки, отсчитанный от `/admin`: роутер ждёт от дочернего
 * роута относительный путь, а константы адресов — абсолютные, потому что
 * их же ставят в `<Link>`.
 *
 * Функция, а не `slice` по месту: мест стало три — раскладка разделов
 * и два адреса формы карточки ППС.
 */
function adminChildPath(path: string): string {
  return path.slice(`${ADMIN_ROUTE}/`.length);
}

// Базовые роуты
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <RouteError />,
    children: [
      // === APP_LAYOUT_ROUTES (UitsModule) ===
      // Главная. Собирается из трёх кусков: редактируемый блок `home-before`,
      // лента новостей, редактируемый блок `home-after`.
      {
        index: true,
        element: <HomePage />,
        errorElement: <RouteError />,
      },
      { path: '/home', element: <LegacyRedirect to={HOME_ROUTE} />, errorElement: <RouteError /> },
      { path: '/partners', element: <LegacyRedirect to={PARTNERS_ROUTE} />, errorElement: <RouteError /> },
      { path: PARTNERS_ROUTE, element: <PartnersPage />, errorElement: <RouteError /> },
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
      // Контакты. Смешанная страница, и потому своей записью, а не строкой
      // в `EDITABLE_PAGES` выше: текст приходит редактируемым разделом
      // `contacts`, но карта и чат вокруг него свёрстаны руками, и одним
      // слагом с заголовком, как девять разделов F-23, она не описывается.
      //
      // Адрес взят из меню (`shared/config/navigation.ts`, пункт
      // `about/contacts`) и повторяет старый портал. Строкой здесь, а не
      // константой в `shared/config/routes.ts`, по той же причине, что
      // у истории: адрес знает один роутер, в меню он лежит своей записью,
      // а больше собирать его некому.
      {
        path: '/about/contacts',
        element: <ContactsPage />,
        errorElement: <RouteError />,
      },
      // Благодарности. Статическая, как история: список тех, кто делал
      // портал, лежит в коде страницы, ручки у него нет и не будет —
      // он про работу над сайтом, а не про кафедру.
      //
      // Адрес взят из меню (`shared/config/navigation.ts`, пункт
      // `about/contributors`) и повторяет старый портал. Строкой здесь,
      // а не константой в `shared/config/routes.ts`, по той же причине,
      // что у истории и контактов: адрес знает один роутер, в меню он
      // лежит своей записью, а больше собирать его некому.
      {
        path: '/about/contributors',
        element: <ContributorsPage />,
        errorElement: <RouteError />,
      },
      // Аспирантура. Смешанная страница, как контакты: текст приходит
      // редактируемым разделом `scientific-activity-postgraduate`,
      // а таблица аспирантов рядом с ним — своим запросом
      // к `GET /api/public/postgraduates`. Одним слагом с заголовком,
      // как девять разделов F-23, она поэтому не описывается.
      //
      // Адрес — константой из `shared/config/routes.ts`, в отличие
      // от истории, контактов и благодарностей: страница собирает адреса
      // пагинатора, то есть знает его не только роутер.
      {
        path: POSTGRADUATE_ROUTE,
        element: <PostgraduatePage />,
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
      {
        path: `${ANNOUNCEMENTS_ROUTE}/:id`,
        element: <LegacyRedirect to={`${NEWS_ROUTE}/:id`} />,
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
          { path: ':id/publications', element: <TeacherDetailPage publicationsOnly />, errorElement: <RouteError /> },
          ...['general', 'schedule', 'disciplines', 'achievements'].map((tab) => ({
            path: `:id/${tab}`,
            element: <LegacyRedirect to={`${TEACHERS_ROUTE}/:id`} />,
            errorElement: <RouteError />,
          })),
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
      // Расписание экзаменов. Публичное: все три ручки, которые страница
      // зовёт, открыты без входа. Адрес — константой: страница собирает
      // по нему ссылку «все группы» (F-56).
      {
        path: EXAM_SCHEDULE_ROUTE,
        element: <ExamSchedulePage />,
        errorElement: <RouteError />,
      },
      // Сводное расписание пар. Публичное: ручка `GET /api/public/schedule`
      // открыта без входа (F-57).
      {
        path: SCHEDULE_SUMMARY_ROUTE,
        element: <ScheduleSummaryPage />,
        errorElement: <RouteError />,
      },
      // Редактируемые разделы. Публичные: ручка `GET /api/public/pages/{slug}`
      // открыта всем. Одна страница на девять адресов — разделы отличаются
      // только слагом и заголовком, оба лежат в таблице выше.
      ...EDITABLE_PAGES.map(({ path, slug, heading }) => ({
        path,
        element: <EditablePagePage slug={slug} heading={heading} />,
        errorElement: <RouteError />,
      })),
      // Личный кабинет. Внутри общего лейаута — шапка нужна и здесь, — но
      // со своим `CorpLayout`: вкладки «Личный кабинет · Календарь событий»
      // вместо бокового меню оригинала. Вход проверяется один раз на весь
      // раздел; календарю сверх того нужна роль (`RoleRoute`).
      {
        path: '/corp',
        element: (
          <ProtectedRoute>
            <CorpLayout />
          </ProtectedRoute>
        ),
        errorElement: <RouteError />,
        children: [
          // Голый /corp — раздел, а не страница: как и в оригинале,
          // отправляем на единственную готовую страницу раздела.
          {
            index: true,
            element: <Navigate to={PERSONAL_ROUTE} replace />,
            errorElement: <RouteError />,
          },
          {
            path: PERSONAL_ROUTE,
            element: <PersonalPage />,
            errorElement: <RouteError />,
          },
          {
            path: CALENDAR_ROUTE,
            element: (
              <RoleRoute access="calendar">
                <CalendarPage />
              </RoleRoute>
            ),
            errorElement: <RouteError />,
          },
        ],
      },
      // Админка. За `RoleRoute`: внутрь пускают админа и модератора,
      // вошедший преподаватель видит отказ, а гость — форму входа.
      //
      // Внутри общего лейаута, как и личный кабинет: шапка с меню профиля
      // нужна и здесь, а второй лейаут означал бы вторую шапку.
      //
      // Экраны разделов и пункты меню используют общий список ADMIN_SECTIONS.
      {
        path: ADMIN_ROUTE,
        element: (
          <RoleRoute access="moderator">
            <AdminLayout />
          </RoleRoute>
        ),
        errorElement: <RouteError />,
        children: [
          { index: true, element: <AdminHomePage />, errorElement: <RouteError /> },
          ...ADMIN_SECTIONS.map((section) => ({
            path: adminChildPath(section.path),
            // Второй `RoleRoute` внутри первого — только там, где раздел
            // строже лейаута: учётные записи закрыты от модератора,
            // и без него он дошёл бы до экрана, а `403` получил уже
            // от бэкенда, посреди пустой таблицы.
            element:
              section.access === 'admin' ? (
                <RoleRoute access="admin">
                  <AdminSectionScreen sectionKey={section.key} />
                </RoleRoute>
              ) : (
                <AdminSectionScreen sectionKey={section.key} />
              ),
            errorElement: <RouteError />,
          })),
          /*
           * Форма карточки ППС — своим адресом, а не окном-панелью
           * (разбор в `shared/config/routes.ts`, у `adminTeacherRoute`).
           *
           * Двумя плоскими записями, а не вложенными в раздел: раздел
           * раскладывается из `ADMIN_SECTIONS` общим правилом, и ветка
           * `children` у одного из девяти означала бы исключение в этом
           * правиле — ради двух адресов, которые роутер ранжирует
           * по точности сам, независимо от порядка в массиве.
           *
           * `new` отдельной записью, а не словом в `:id`: у неё нет
           * параметра вовсе, и это единственное, чем «завести новую»
           * отличается от опечатки в адресе. Опечатка обязана показать
           * «карточка не найдена», а не пустую форму создания.
           */
          {
            path: `${adminChildPath(ADMIN_TEACHERS_ROUTE)}/new`,
            element: <TeacherFormPage />,
            errorElement: <RouteError />,
          },
          {
            path: `${adminChildPath(ADMIN_TEACHERS_ROUTE)}/:id`,
            element: <TeacherFormPage />,
            errorElement: <RouteError />,
          },
          // Форма записи аспирантуры — тем же устройством и по тому же
          // доводу, что у карточки ППС: форме нужен свой запрос (разбор
          // у `adminPostgraduateRoute`).
          {
            path: `${adminChildPath(ADMIN_POSTGRADUATES_ROUTE)}/new`,
            element: <PostgraduateFormPage />,
            errorElement: <RouteError />,
          },
          {
            path: `${adminChildPath(ADMIN_POSTGRADUATES_ROUTE)}/:id`,
            element: <PostgraduateFormPage />,
            errorElement: <RouteError />,
          },
          // Форма раздела сайта — тоже своим адресом и тоже плоской записью,
          // но довод другой: не догрузка, а ширина документа (разбор
          // у `adminEditablePageRoute`). Записи `new` нет: набор разделов
          // закрыт, и негодный слаг форма разбирает сама.
          {
            path: `${adminChildPath(ADMIN_PAGES_ROUTE)}/:slug`,
            element: <EditablePageFormPage />,
            errorElement: <RouteError />,
          },
          {
            path: `${adminChildPath(ADMIN_GRADESHEETS_ROUTE)}/:id`,
            element: <GradesheetPage />,
            errorElement: <RouteError />,
          },
          { path: '*', element: <UnknownSectionPage />, errorElement: <RouteError /> },
        ],
      },
      { path: PUBLICATIONS_ROUTE, element: <PublicationsPage />, errorElement: <RouteError /> },
      { path: publicationRoute(':id'), element: <PublicationDetailPage />, errorElement: <RouteError /> },
      ...[
        { path: PUBLICATION_MANAGE_ROUTE, element: <PublicationsPage manage /> },
        { path: PUBLICATION_NEW_ROUTE, element: <PublicationEditorPage /> },
        { path: publicationEditRoute(':id'), element: <PublicationEditorPage /> },
        { path: PUBLICATION_TAGS_ROUTE, element: <PublicationTagsPage /> },
        { path: PUBLICATION_SCHOLAR_ROUTE, element: <PublicationScholarPage /> },
      ].map(({ path, element }) => ({
        path,
        element: <RoleRoute access="moderator">{element}</RoleRoute>,
        errorElement: <RouteError />,
      })),
      { path: '*', element: <NotFoundPage />, errorElement: <RouteError /> },
    ],
  },
  {
    path: '/auth',
    element: (
      <Suspense fallback={<Loader />}>
        <AuthLayout />
      </Suspense>
    ),
    errorElement: <RouteError />,
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
        errorElement: <RouteError />,
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
