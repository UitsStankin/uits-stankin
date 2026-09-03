/**
 * Единая точка импорта типов: `import type { News, Page } from '@shared/types'`.
 *
 * Типы контракта разложены по модулям бэкенда — `auth`, `news`, `staff` —
 * плюс `api` для общего транспорта. Отдельно стоит `planned`: модели,
 * которым сегодня не соответствует ни одна ручка. Из барреля они
 * **не реэкспортируются намеренно** — импорт оттуда должен оставаться
 * заметным, поэтому пишется полным путём:
 *
 *   import type { Achievement } from '@shared/types/planned.types';
 */

// Транспорт
export type { Page, PageParams, FileCategory, FileUploadResponse } from './api.types';

// Аутентификация и профиль
export type {
  Profile,
  LoginRequest,
  AccessTokenResponse,
  ChangePasswordRequest,
} from './auth.types';

// Новости и объявления
export type { News, NewsRequest, NewsPage, NewsListParams, PostType } from './news.types';

// Конференции
export type { Conference, ConferenceRequest, ConferencePage } from './conference.types';

// Редактируемые разделы
export type { EditablePage, EditablePageSlug } from './pages.types';

// Преподаватели и УВП
export type {
  Teacher,
  TeacherListItem,
  TeacherPage,
  TeacherDegree,
  TeacherRank,
  TeacherUpsertRequest,
  Subject,
  Helper,
  HelperPage,
} from './staff.types';

// Навигация
export type { NavItem } from './nav.types';
