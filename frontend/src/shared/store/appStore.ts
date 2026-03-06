import { create } from 'zustand';
import type { AppStore } from './appStore.types';
import { defaultAppConfig } from './appStore.constants';

export const useAppStore = create<AppStore>((set) => ({
  // === STATE ===
  config: defaultAppConfig,

  // === ACTIONS ===
  updateConfig: (newConfig) =>
    set((state) => ({
      config: { ...state.config, ...newConfig },
    })),

  setLayout: (layout) =>
    set((state) => ({
      config: { ...state.config, layoutType: layout },
    })),

  toggleTheme: () =>
    set((state) => {
      const next = state.config.theme === 'light' ? 'dark' : 'light';
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('dark', next === 'dark');
      }
      return { config: { ...state.config, theme: next } };
    }),

  toggleSidebar: () =>
    set((state) => {
      const current = state.config.layoutType;
      const next = current === 'default' ? 'compact' : 'default';
      return { config: { ...state.config, layoutType: next } };
    }),

  setLocale: (locale) =>
    set((state) => ({
      config: { ...state.config, locale },
    })),
}));

// === Селекторы (выносим логику из компонентов) ===
export const selectLayout = (state: AppStore) => state.config.layoutType;
export const selectTheme = (state: AppStore) => state.config.theme;
export const selectLocale = (state: AppStore) => state.config.locale;