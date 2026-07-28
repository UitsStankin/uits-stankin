/**
 * Пропсы компонента AppLayout
 */
export interface AppLayoutProps {
  /** Дополнительные классы для корня */
  className?: string;
}

/*
 * onSidebarToggle и AppLayoutComputed убраны вместе с сайдбаром: портал
 * работает на горизонтальном меню, вертикального в нём нет. Ширины и отступы
 * под сайдбар (LAYOUT_WIDTHS, CONTENT_MARGINS) больше не вычисляются.
 */
