import { useSyncExternalStore } from 'react';

import { getToken, subscribeToken } from '@shared/api';

/**
 * Токен как реактивное значение: компонент, который его читает,
 * перерисуется при входе и при выходе.
 *
 * `useSyncExternalStore` — штатный способ подружить React с состоянием,
 * которое живёт снаружи. Альтернативы хуже: `useState` пришлось бы
 * синхронизировать вручную из трёх мест (форма входа, кнопка выхода,
 * интерцептор на 401), а `useEffect` с опросом localStorage — это опрос
 * localStorage.
 *
 * Снимок — сама строка токена, а не флаг «есть/нет»: примитив, поэтому
 * React сравнивает его по значению и лишних перерисовок не будет.
 * Смена пользователя без выхода тоже не потеряется.
 */
export function useAccessToken(): string | null {
  return useSyncExternalStore(subscribeToken, getToken);
}
