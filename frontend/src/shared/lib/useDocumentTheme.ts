import { useEffect } from 'react';

import { useThemeStore } from '@shared/store';

export function useDocumentTheme(isThemed: boolean): void {
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    document.documentElement.dataset.theme = isThemed ? theme : 'light';
  }, [isThemed, theme]);
}
