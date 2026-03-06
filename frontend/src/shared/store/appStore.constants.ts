import type { AppConfig } from '../types/layout.types';

/**
 * Дефолтная конфигурация приложения
 * Вынесена отдельно для чистоты и тестирования
 */
export const defaultAppConfig: AppConfig = {
  layoutType: 'default',
  theme: 'light',
  sidebarCollapsed: false,
  locale: 'ru',
};

/**
 * Маппинг типов макета в классы Tailwind
 */
export const LAYOUT_WIDTHS = {
  default: 'w-[17.5rem]',  // $side-nav-width
  compact: 'w-[4rem]',     // $side-nav-collapse-width  
  wide: 'w-[20rem]',       // кастомное расширение
} as const;

/**
 * Маппинг отступов контента под сайдбар
 */
export const CONTENT_MARGINS = {
  default: 'md:ml-[17.5rem]',
  compact: 'md:ml-[4rem]',
  wide: 'md:ml-[20rem]',
} as const;