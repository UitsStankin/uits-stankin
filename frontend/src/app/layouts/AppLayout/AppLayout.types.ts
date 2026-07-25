import type { LayoutType } from '@/shared/types';

/**
 * Пропсы компонента AppLayout
 */
export interface AppLayoutProps {
  /** Опциональный колбэк при переключении сайдбара */
  onSidebarToggle?: (collapsed: boolean) => void;
  
  /** Дополнительные классы для корня */
  className?: string;
}

/**
 * Внутренние вычисленные значения
 */
export interface AppLayoutComputed {
  sidebarWidthClass: string;
  contentMarginClass: string;
  isSidebarCollapsed: boolean;
}