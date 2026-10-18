export interface AppState {
  /** Открыто ли меню разделов. */
  isMenuOpen: boolean;
}

export interface AppActions {
  openMenu: () => void;
  closeMenu: () => void;
}

export type AppStore = AppState & AppActions;
