export interface AppState {
  /** Открыта ли выдвижная панель мобильного меню. */
  isMobileNavOpen: boolean;
}

export interface AppActions {
  openMobileNav: () => void;
  closeMobileNav: () => void;
}

export type AppStore = AppState & AppActions;
