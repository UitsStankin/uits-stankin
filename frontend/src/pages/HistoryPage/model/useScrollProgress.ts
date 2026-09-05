import { useSyncExternalStore } from 'react';

import { scrollProgressPercent } from '../lib/scrollProgress';

function subscribe(onChange: () => void): () => void {
  // passive — обещание браузеру, что прокрутку никто не отменит: без него
  // он ждёт возврата обработчика, прежде чем двигать страницу.
  window.addEventListener('scroll', onChange, { passive: true });
  // Не только прокрутка: от ширины окна зависит высота документа, и после
  // поворота телефона доля прочитанного другая при том же `scrollY`.
  window.addEventListener('resize', onChange, { passive: true });

  return () => {
    window.removeEventListener('scroll', onChange);
    window.removeEventListener('resize', onChange);
  };
}

function getSnapshot(): number {
  return scrollProgressPercent(
    window.scrollY,
    document.documentElement.scrollHeight,
    window.innerHeight,
  );
}

/**
 * Сколько страницы прочитано, в целых процентах.
 *
 * Через `useSyncExternalStore`, как `useIsDesktop` у навбара: состояние
 * живёт в браузере, а не в React, и подписка на него — ровно то, для чего
 * этот хук существует. Пара `useState` + `useEffect` дала бы то же самое
 * длиннее и с лишним первым кадром.
 *
 * Снимок — число, поэтому сравнение по `Object.is` работает само:
 * прокрутка, не сдвинувшая процент, перерисовки не вызывает. А та, что
 * сдвинула, перерисовывает страницу целиком — но не её разметку: пропсы
 * ленты не меняются, и React Compiler отдаёт прежнее дерево.
 */
export function useScrollProgress(): number {
  return useSyncExternalStore(subscribe, getSnapshot);
}
