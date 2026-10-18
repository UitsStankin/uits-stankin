import { useCallback, useEffect, useRef, useState } from 'react';

import { useAppStore } from '@shared/store';

const CLOSE_MS = 200;

/**
 * Состояние листа меню. Закрытие не мгновенное: лист сначала гаснет
 * (`isClosing`), и только потом исчезает из дерева. Страница под ним успевает
 * смениться, пока меню гаснет, и переход выглядит плавным, а не скачком.
 */
export function useMenuSheet() {
  const isOpen = useAppStore((state) => state.isMenuOpen);
  const open = useAppStore((state) => state.openMenu);
  const finishClose = useAppStore((state) => state.closeMenu);
  const [isClosing, setIsClosing] = useState(false);
  const timer = useRef<number | null>(null);

  const close = useCallback(() => {
    if (timer.current !== null) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setIsClosing(true);
    timer.current = window.setTimeout(
      () => {
        timer.current = null;
        setIsClosing(false);
        finishClose();
      },
      reduced ? 0 : CLOSE_MS,
    );
  }, [finishClose]);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

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

  return { isOpen, isClosing, open, close };
}
