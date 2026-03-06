/**
 * Типы макета приложения
 * Соответствует SCSS-переменным $side-nav-width, $side-nav-collapse-width
 */
export type LayoutType = 'default' | 'compact' | 'wide';

/**
 * Тема интерфейса
 */
export type ThemeType = 'light' | 'dark';

/**
 * Конфигурация приложения
 * Соответствует AppConfig из Angular
 */
export interface AppConfig {
  /** Тип макета (управляет шириной сайдбара) */
  layoutType: LayoutType;
  
  /** Цветовая тема */
  theme: ThemeType;
  
  /** Сайдбар свёрнут (для мобильного меню) */
  sidebarCollapsed: boolean;
  
  /** Язык интерфейса */
  locale: string;
  
  /** Дополнительные настройки */
  [key: string]: unknown;
}