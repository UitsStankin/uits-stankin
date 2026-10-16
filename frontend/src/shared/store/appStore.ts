import { create } from 'zustand';
import type { AppStore } from './appStore.types';

/**
 * Состояние интерфейса, общее для нескольких виджетов.
 *
 * Пока в нём одно: открыта ли панель мобильного меню. Она нужна сразу двум
 * виджетам — кнопка-бургер живёт в Header, а сама панель в Navbar. Тянуть
 * состояние через AppLayout пропсами значило бы связать виджеты между собой
 * лейаутом; в оригинале это решено так же — флагом mobileNavCollapse
 * в глобальном сторе NGXS.
 *
 * До этого здесь лежала заготовка шаблона Espire — layoutType, тема, локаль,
 * sidebarCollapsed. Все 137 строк вместе с типами и константами ссылались
 * только друг на друга: useAppStore не вызывался ни из одного компонента.
 * Заменены на то, что реально используется.
 */
export const useAppStore = create<AppStore>((set) => ({
  isMobileNavOpen: false,

  openMobileNav: () => set({ isMobileNavOpen: true }),
  closeMobileNav: () => set({ isMobileNavOpen: false }),
}));
