export interface HeaderProps {
  className?: string;
  /** Шапка лежит поверх первого экрана (главная), а не занимает своё место в потоке. */
  overlay?: boolean;
  /** Показывать переключатель темы: на страницах админки тема всегда светлая. */
  showThemeToggle?: boolean;
}
