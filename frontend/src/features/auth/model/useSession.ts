import { useSyncExternalStore } from 'react';

import { getAccessToken, hasSession, subscribeSession } from '@shared/api';

/**
 * Сессия как реактивное значение: компонент, который её читает,
 * перерисуется при входе и при выходе — в том числе при выходе
 * в соседней вкладке.
 *
 * `useSyncExternalStore` — штатный способ подружить React с состоянием,
 * которое живёт снаружи. Альтернативы хуже: `useState` пришлось бы
 * синхронизировать вручную из четырёх мест (форма входа, кнопка выхода,
 * обмен токена, интерцептор на 401), а `useEffect` с опросом хранилища —
 * это опрос хранилища.
 *
 * Оба снимка — примитивы, поэтому React сравнивает их по значению
 * и лишних перерисовок не будет.
 */

/**
 * Сам токен, а не флаг «есть/нет»: смена пользователя без выхода
 * так тоже не потеряется.
 */
export function useAccessToken(): string | null {
  return useSyncExternalStore(subscribeSession, getAccessToken);
}

/**
 * Есть ли сессия, которую стоит восстанавливать. Отличается от токена
 * ровно в момент запуска вкладки: токена ещё нет, а refresh-cookie,
 * возможно, есть — и в шапке в этот момент правильно показать не «вход»,
 * а ожидание.
 */
export function useHasSession(): boolean {
  return useSyncExternalStore(subscribeSession, hasSession);
}
