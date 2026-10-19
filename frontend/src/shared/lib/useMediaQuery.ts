import { useSyncExternalStore } from 'react';

function subscribe(query: string, notify: () => void): () => void {
  if (typeof window.matchMedia !== 'function') return () => {};

  const list = window.matchMedia(query);
  list.addEventListener('change', notify);

  return () => list.removeEventListener('change', notify);
}

/**
 * Совпадает ли окно с медиазапросом сейчас и после каждого его изменения.
 * Там, где `matchMedia` нет, отвечает `false`.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => subscribe(query, notify),
    () => typeof window.matchMedia === 'function' && window.matchMedia(query).matches,
    () => false,
  );
}
