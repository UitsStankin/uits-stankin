import { useSyncExternalStore } from 'react';

/**
 * Брейкпоинт из оригинала: ниже 992px вместо навбара показывается бургер.
 * Совпадает с `lg` в tailwind.config.ts — оба перенесены из Bootstrap.
 */
const DESKTOP_QUERY = '(min-width: 992px)';

function subscribe(onChange: () => void): () => void {
  const mql = window.matchMedia(DESKTOP_QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

function getSnapshot(): boolean {
  return window.matchMedia(DESKTOP_QUERY).matches;
}

/**
 * Десктопная ли сейчас ширина.
 *
 * Через useSyncExternalStore, а не через слушатель resize в useEffect:
 * matchMedia дёргает подписку только при пересечении границы, а не на
 * каждый пиксель перетаскивания окна.
 *
 * Нужен именно JS, а не CSS-классы `hidden lg:block`: иначе оба меню
 * оказались бы в DOM одновременно, и скринридер читал бы всю навигацию
 * дважды.
 */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot);
}
