/**
 * Хранилище access-токена — единственное место в приложении, которое знает,
 * ГДЕ он лежит.
 *
 * Сейчас это localStorage, и это осознанный долг: токен виден любому скрипту
 * на странице, то есть XSS уносит сессию целиком. Правильный вариант — держать
 * токен в памяти, а сессию продлевать httpOnly refresh-cookie — сегодня
 * недоступен: refresh-ручки на бэкенде нет (T-30, блок 3 бэкенд-бэклога),
 * а без неё токен в памяти означает разлогин на каждой перезагрузке страницы.
 * docs/API.md фиксирует то же самое: «Refresh-токен появится позже, вместе
 * с cookie и ужесточением CORS; до этого работать только с accessToken».
 *
 * Ради этого модуль и вынесен отдельным файлом: в день T-30 переезд стоит
 * правки здесь плюс ветки refresh в интерцепторе, а прикладной код — хуки,
 * формы, страницы — не трогается вовсе. Поэтому дёргать localStorage напрямую
 * нельзя даже «всего в одном месте»: именно так шов и размывается, а потом
 * ищется grep'ом по всему проекту.
 *
 * Ключ отличается от `access_token` из прежнего мокового useAuth намеренно —
 * фальшивые `mock-token-…`, осевшие в браузерах за время работы на заглушках,
 * просто перестают читаться.
 */

const TOKEN_KEY = 'accessToken';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  notify();
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  notify();
}

/*
 * Рассылка изменений.
 *
 * localStorage не реактивен: `setItem` ничего не сообщает ни React, ни кому-либо
 * ещё. Без этой рассылки после успешного входа шапка продолжала бы
 * показывать «Вход для персонала» до первого случайного перерендера, а после
 * выхода — имя ушедшего пользователя. Хранилище поэтому дополнено подпиской
 * и работает источником для `useSyncExternalStore`
 * (`features/auth/model/useAccessToken.ts`).
 *
 * Собственная подписка, а не событие `storage`: браузер шлёт `storage`
 * только в ДРУГИЕ вкладки, в той, где вызвали `setItem`, его не будет.
 * Слушать его всё равно нужно — тогда выход в одной вкладке разлогинивает
 * остальные, — но как дополнение, а не как основной механизм.
 */

type Listener = () => void;

const listeners = new Set<Listener>();

function notify(): void {
  for (const listener of listeners) listener();
}

function handleStorageEvent(event: StorageEvent): void {
  // `key === null` — в соседней вкладке позвали `localStorage.clear()`.
  if (event.key === TOKEN_KEY || event.key === null) notify();
}

/**
 * Подписаться на появление и исчезновение токена. Возвращает отписку.
 *
 * Слушатель окна вешается на время, пока есть хоть один подписчик: постоянно
 * висящий обработчик в модуле мешал бы тестам и стрелял бы в окружении
 * без window.
 */
export function subscribeToken(listener: Listener): () => void {
  if (listeners.size === 0) window.addEventListener('storage', handleStorageEvent);
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener('storage', handleStorageEvent);
  };
}
