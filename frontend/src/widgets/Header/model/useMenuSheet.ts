import { useEffect } from 'react';

import { useAppStore } from '@shared/store';

export function useMenuSheet() {
  const isOpen = useAppStore((state) => state.isMenuOpen);
  const open = useAppStore((state) => state.openMenu);
  const close = useAppStore((state) => state.closeMenu);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, close]);

  return { isOpen, open, close };
}
