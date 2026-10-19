import { lazy, Suspense } from 'react';

const STORAGE_KEY = 'uits-query-devtools';

const Devtools = lazy(() =>
  import('@tanstack/react-query-devtools').then(({ ReactQueryDevtools }) => ({
    default: ReactQueryDevtools,
  })),
);

function isEnabled(): boolean {
  if (!import.meta.env.DEV) return false;

  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Панель TanStack Query для разработки. Подгружается только при
 * `localStorage.setItem('uits-query-devtools', '1')` и перезагрузке страницы;
 * в прод-сборку не попадает вовсе.
 */
export function QueryDevtools() {
  if (!isEnabled()) return null;

  return (
    <Suspense fallback={null}>
      <Devtools initialIsOpen={false} />
    </Suspense>
  );
}
