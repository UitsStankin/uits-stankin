import {
  Award,
  BookOpen,
  FileText,
  GraduationCap,
  Mic,
  Newspaper,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react';

import type { AdminAccess } from '@shared/types';

import { ADMIN_ROUTE } from './routes';

export interface AdminSection {
  /** Последний сегмент адреса: `/admin/subjects` — это `subjects`. */
  key: string;
  title: string;
  icon: LucideIcon;
  path: string;
  /** Кому раздел показывать и кого пускать внутрь. */
  access: AdminAccess;
  /**
   * Тикет, с которым раздел появится. У готовых разделов поля нет —
   * по нему же роутер отличает настоящую страницу от заглушки.
   *
   * Заглушка, а не отсутствие пункта: набор разделов админки — это карта
   * работ блока 4, и видеть её целиком полезнее, чем меню, растущее
   * по одному пункту. Ссылка при этом честная: заглушка говорит, какой
   * тикет и что принесёт, вместо «страница не найдена».
   */
  plannedIn?: string;
}

/**
 * Разделы админки — то же, чем для портала является `navigation.ts`.
 *
 * Список закрывает ровно те сущности, у которых в контракте есть
 * модераторский CRUD (docs/API.md, «Эндпоинты»). Чего здесь нет
 * намеренно: научных публикаций с тегами (Фаза 4), календаря событий
 * (Фаза 3), импорта расписаний, экзаменов и ведомостей (Фаза 2) — их
 * экраны приедут вместе со своими фазами, и пункт меню, ведущий
 * в никуда полгода, полезнее не делает.
 *
 * Порядок — от того, что правят каждую неделю, к тому, что правят раз
 * в семестр: новости и объявления сверху, справочники и учётки внизу.
 *
 * Единственный раздел с `access: 'admin'` — учётные записи: `/api/users`
 * закрыт от модератора, и это первое место портала, где две
 * управляющие роли расходятся (docs/API.md, «Роли»).
 */
export const ADMIN_SECTIONS: readonly AdminSection[] = [
  {
    key: 'news',
    title: 'Новости и объявления',
    icon: Newspaper,
    path: `${ADMIN_ROUTE}/news`,
    access: 'moderator',
    plannedIn: 'F-43',
  },
  {
    key: 'conferences',
    title: 'Конференции',
    icon: Mic,
    path: `${ADMIN_ROUTE}/conferences`,
    access: 'moderator',
    plannedIn: 'F-45',
  },
  {
    key: 'achievements',
    title: 'Достижения кафедры',
    icon: Award,
    path: `${ADMIN_ROUTE}/achievements`,
    access: 'moderator',
    plannedIn: 'F-45',
  },
  {
    key: 'teachers',
    title: 'Преподаватели',
    icon: Users,
    path: `${ADMIN_ROUTE}/teachers`,
    access: 'moderator',
    plannedIn: 'F-44',
  },
  {
    key: 'helpers',
    title: 'Учебно-вспомогательный персонал',
    icon: UserCog,
    path: `${ADMIN_ROUTE}/helpers`,
    access: 'moderator',
    plannedIn: 'F-44',
  },
  {
    key: 'postgraduates',
    title: 'Аспирантура',
    icon: GraduationCap,
    path: `${ADMIN_ROUTE}/postgraduates`,
    access: 'moderator',
    plannedIn: 'F-47',
  },
  {
    key: 'subjects',
    title: 'Дисциплины',
    icon: BookOpen,
    path: `${ADMIN_ROUTE}/subjects`,
    access: 'moderator',
    plannedIn: 'F-40',
  },
  {
    key: 'pages',
    title: 'Разделы сайта',
    icon: FileText,
    path: `${ADMIN_ROUTE}/pages`,
    access: 'moderator',
    plannedIn: 'F-45',
  },
  {
    key: 'users',
    title: 'Учётные записи',
    icon: Users,
    path: `${ADMIN_ROUTE}/users`,
    access: 'admin',
    plannedIn: 'F-46',
  },
];
