import { Moon, Sun } from 'lucide-react';

import { useThemeStore } from '@shared/store';

export function ThemeToggle() {
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      className="u-icon-btn"
      aria-label={isDark ? 'Включить светлую тему' : 'Включить тёмную тему'}
      onClick={toggleTheme}
    >
      {isDark ? <Sun size={20} aria-hidden /> : <Moon size={20} aria-hidden />}
    </button>
  );
}
