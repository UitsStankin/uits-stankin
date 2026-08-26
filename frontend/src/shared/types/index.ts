/**
 * Единая точка импорта типов: `import type { News, Page } from '@shared/types'`.
 *
 * Типы контракта разложены по модулям бэкенда — `news`, `staff` — плюс `api`
 * для общего транспорта.
 */

// Транспорт
export type { Page, PageParams, FileCategory, FileUploadResponse } from './api.types';

// Новости и объявления
export type { News, NewsRequest, NewsPage, PostType } from './news.types';

// Преподаватели
export type { Teacher, TeacherPage } from './staff.types';

// Навигация
export type { NavItem } from './nav.types';
