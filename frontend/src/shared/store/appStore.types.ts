import type { AppConfig, LayoutType } from '../types/layout.types';

/**
 * Состояние глобального стейта приложения
 */
export interface AppState {
  /** Конфигурация приложения */
  config: AppConfig;
}

/**
 * Экшены для обновления конфигурации
 */
export interface AppActions {
  /** Частичное обновление конфига */
  updateConfig: (newConfig: Partial<AppConfig>) => void;
  
  /** Установка типа макета */
  setLayout: (layout: LayoutType) => void;
  
  /** Переключение темы */
  toggleTheme: () => void;
  
  /** Переключение сайдбара (для мобильных) */
  toggleSidebar: () => void;
  
  /** Установка языка */
  setLocale: (locale: string) => void;
}

/**
 * Полный тип store = состояние + экшены
 */
export type AppStore = AppState & AppActions;