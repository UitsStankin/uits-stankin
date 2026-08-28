/**
 * Сессия вкладки — единственное место, которое знает, где лежит access-токен
 * и откуда известно, что вход вообще был.
 *
 * Токен живёт в ПАМЯТИ модуля, а не в `localStorage`. Там он переживал
 * закрытие вкладки и был доступен любому скрипту страницы: одна XSS уносила
 * сессию целиком, причём надолго. В памяти он умирает вместе с вкладкой,
 * а вернуть его после перезагрузки умеет refresh-cookie — httpOnly,
 * JS её не видит вовсе (docs/API.md, «Аутентификация»). До T-30 обменивать
 * cookie на токен было не на что, и `localStorage` был осознанным долгом
 * F-10; F-15 этот долг закрывает.
 *
 * В `localStorage` остаётся ровно одна вещь — признак сессии. Это НЕ токен
 * и не его половина: строка, по которой вкладка при запуске понимает,
 * стоит ли идти за обменом. Без неё пришлось бы дёргать `refresh` на каждой
 * загрузке любой страницы портала — а портал публичный, и подавляющее
 * большинство его посетителей никогда не входили и не войдут. Признаку
 * можно не доверять с обеих сторон: устаревший стоит одного лишнего 401
 * на `refresh`, потерянный — необходимости войти заново.
 *
 * Он же чинит то, что сломал переезд в память: cookie у вкладок общая,
 * а токен теперь у каждой свой. Выход в одной вкладке стирает признак,
 * событие `storage` доносит это до соседних, и они забывают свои токены —
 * ровно так же, как раньше это делало исчезновение токена из хранилища.
 *
 * Ради этого модуль и вынесен отдельным файлом: ни хуки, ни формы,
 * ни страницы не знают, где хранится токен, и переезд стоил правки здесь
 * плюс ветки обмена в интерцепторе.
 */

/**
 * Ключ признака. Отличается от прежнего `accessToken` намеренно: токены,
 * осевшие в браузерах до F-15, перестают читаться, а не оживают
 * просроченными.
 */
const SESSION_KEY = 'session';

let accessToken: string | null = null;

/**
 * Копия признака в памяти. `useSyncExternalStore` дёргает снимок на каждый
 * рендер, и поход в `localStorage` за одним и тем же значением там лишний.
 */
let hasSessionHint = localStorage.getItem(SESSION_KEY) !== null;

export function getAccessToken(): string | null {
  return accessToken;
}

/**
 * Есть ли сессия, за которую стоит бороться: токен на руках либо признак
 * того, что у браузера есть refresh-cookie. Отвечает на два вопроса —
 * «идти ли за обменом при запуске» и «есть ли смысл обновлять токен
 * в ответ на 401».
 */
export function hasSession(): boolean {
  return accessToken !== null || hasSessionHint;
}

/** Запомнить свежий токен: и после входа, и после каждого обмена. */
export function setAccessToken(token: string): void {
  accessToken = token;

  // Признак поднимается один раз за сессию: перезапись тем же значением
  // ничего не меняет, но будит соседние вкладки событием `storage`.
  if (!hasSessionHint) {
    localStorage.setItem(SESSION_KEY, '1');
    hasSessionHint = true;
  }

  notify();
}

/** Забыть сессию целиком: выход, протухший refresh, отказ в правах. */
export function clearSession(): void {
  accessToken = null;
  hasSessionHint = false;
  localStorage.removeItem(SESSION_KEY);
  notify();
}

/*
 * Рассылка изменений.
 *
 * Ни память модуля, ни `localStorage` не реактивны: присваивание ничего
 * не сообщает ни React, ни кому-либо ещё. Без рассылки после успешного входа
 * шапка продолжала бы показывать «Вход для персонала» до первого случайного
 * перерендера, а после выхода — имя ушедшего пользователя. Отсюда подписка,
 * работающая источником для `useSyncExternalStore`
 * (`features/auth/model/useSession.ts`).
 *
 * Собственная подписка, а не только событие `storage`: браузер шлёт `storage`
 * в ДРУГИЕ вкладки, в той, где вызвали `setItem`, его не будет.
 */

type Listener = () => void;

const listeners = new Set<Listener>();

function notify(): void {
  for (const listener of listeners) listener();
}

function handleStorageEvent(event: StorageEvent): void {
  // `key === null` — в соседней вкладке позвали `localStorage.clear()`.
  if (event.key !== SESSION_KEY && event.key !== null) return;

  const hint = localStorage.getItem(SESSION_KEY) !== null;
  if (hint === hasSessionHint) return;

  hasSessionHint = hint;

  // Признак сняли в соседней вкладке — там вышли, и сервер погасил cookie.
  // Свой токен эта вкладка держать больше не вправе: он ещё несколько минут
  // проработал бы, показывая интерфейс вышедшего пользователя.
  //
  // Обратный случай — признак ПОЯВИЛСЯ, в соседней вкладке вошли — токена
  // здесь нет, и добывать его отсюда нечем: обменом займётся
  // `useRestoreSession`, для которого признак и есть условие запуска.
  if (!hint) accessToken = null;

  notify();
}

/**
 * Подписаться на появление и исчезновение сессии. Возвращает отписку.
 *
 * Слушатель окна вешается на время, пока есть хоть один подписчик: постоянно
 * висящий обработчик в модуле мешал бы тестам и стрелял бы в окружении
 * без window.
 */
export function subscribeSession(listener: Listener): () => void {
  if (listeners.size === 0) window.addEventListener('storage', handleStorageEvent);
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener('storage', handleStorageEvent);
  };
}

