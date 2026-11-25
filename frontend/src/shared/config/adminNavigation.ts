import {
  Award,
  BookOpen,
  FileText,
  FileSpreadsheet,
  GraduationCap,
  Library,
  Mic,
  Newspaper,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react';

import type { AdminAccess } from '@shared/types';

import {
  ADMIN_ACHIEVEMENTS_ROUTE,
  ADMIN_CONFERENCES_ROUTE,
  ADMIN_HELPERS_ROUTE,
  ADMIN_GRADESHEETS_ROUTE,
  ADMIN_NEWS_ROUTE,
  ADMIN_PAGES_ROUTE,
  ADMIN_POSTGRADUATES_ROUTE,
  ADMIN_PUBLICATIONS_ROUTE,
  ADMIN_SUBJECTS_ROUTE,
  ADMIN_TEACHERS_ROUTE,
  ADMIN_USERS_ROUTE,
} from './routes';

/**
 * Разделы админки — то же, чем для портала является `navigation.ts`.
 *
 * Список закрывает ровно те сущности, у которых в контракте есть
 * модераторский CRUD (docs/API.md, «Эндпоинты»). Чего здесь нет
 * намеренно: календарь событий живёт в личном кабинете, импорт расписаний и экзаменов —
 * на страницах самих расписаний.
 *
 * Порядок — от того, что правят каждую неделю, к тому, что правят раз
 * в семестр: новости и объявления сверху, справочники и учётки внизу.
 *
 * Единственный раздел с `access: 'admin'` — учётные записи: `/api/users`
 * закрыт от модератора, и это первое место портала, где две
 * управляющие роли расходятся (docs/API.md, «Роли»).
 */
export const ADMIN_SECTIONS = [
  {
    key: 'news',
    title: 'Новости и объявления',
    icon: Newspaper,
    path: ADMIN_NEWS_ROUTE,
    access: 'moderator',
  },
  {
    key: 'conferences',
    title: 'Конференции',
    icon: Mic,
    path: ADMIN_CONFERENCES_ROUTE,
    access: 'moderator',
  },
  {
    key: 'achievements',
    title: 'Достижения кафедры',
    icon: Award,
    path: ADMIN_ACHIEVEMENTS_ROUTE,
    access: 'moderator',
  },
  {
    key: 'publications',
    title: 'Научные публикации',
    icon: Library,
    path: ADMIN_PUBLICATIONS_ROUTE,
    access: 'moderator',
  },
  {
    key: 'teachers',
    title: 'Преподаватели',
    icon: Users,
    path: ADMIN_TEACHERS_ROUTE,
    access: 'moderator',
  },
  {
    key: 'helpers',
    title: 'Учебно-вспомогательный персонал',
    icon: UserCog,
    path: ADMIN_HELPERS_ROUTE,
    access: 'moderator',
  },
  {
    key: 'postgraduates',
    title: 'Аспирантура',
    icon: GraduationCap,
    path: ADMIN_POSTGRADUATES_ROUTE,
    access: 'moderator',
  },
  {
    key: 'gradesheets',
    title: 'Ведомости',
    icon: FileSpreadsheet,
    path: ADMIN_GRADESHEETS_ROUTE,
    access: 'moderator',
  },
  {
    key: 'subjects',
    title: 'Дисциплины',
    icon: BookOpen,
    path: ADMIN_SUBJECTS_ROUTE,
    access: 'moderator',
  },
  {
    key: 'pages',
    title: 'Разделы сайта',
    icon: FileText,
    path: ADMIN_PAGES_ROUTE,
    access: 'moderator',
  },
  {
    key: 'users',
    title: 'Учётные записи',
    icon: Users,
    path: ADMIN_USERS_ROUTE,
    access: 'admin',
  },
] as const satisfies readonly {
  key: string;
  title: string;
  icon: LucideIcon;
  path: string;
  access: AdminAccess;
}[];

export type AdminSection = (typeof ADMIN_SECTIONS)[number];

/**
 * Разделы, которые вошедшему показывать можно.
 *
 * Чистая функция, а не хук: правило одно («учётки — только админу»),
 * а мест, где оно нужно, два — меню раздела и витрина `/admin`. Хук
 * в `app/layouts` не годится: страницам по FSD запрещено смотреть
 * на слой `app`, и второй копией фильтра эти два места разошлись бы
 * при первом же новом разделе с ограничением.
 *
 * Скрытый пункт — не защита, а вежливость: за дверью стоит `RoleRoute`,
 * а на бэкенде `@PreAuthorize`. Но показывать модератору «Учётные записи»,
 * зная, что он получит там отказ, значит предлагать ему сходить за `403`.
 */
export function visibleAdminSections(isAdmin: boolean): readonly AdminSection[] {
  return ADMIN_SECTIONS.filter((section) => section.access !== 'admin' || isAdmin);
}
