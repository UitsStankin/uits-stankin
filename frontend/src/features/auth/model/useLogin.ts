import { useMutation } from '@tanstack/react-query';
import { useLocation, type To } from 'react-router';

import { setAccessToken } from '@shared/api';
import { HOME_ROUTE, LOGIN_ROUTE } from '@shared/config/routes';

import { login } from '../api/authApi';

/**
 * Вход: логин и пароль → токен → переход туда, откуда пришли.
 *
 * Профиль здесь не запрашивается. Он подтянется сам: `setAccessToken`
 * рассылает изменение, `useAuth` в шапке видит токен и включает свой запрос.
 * Тянуть профиль ещё и отсюда значило бы завести второй путь к тому же
 * ответу.
 *
 * Refresh-токен в ответе не приходит и в код не попадает вовсе: он уезжает
 * заголовком `Set-Cookie`, и всё, что для этого нужно от фронта, —
 * `withCredentials` у клиента.
 *
 * Ошибку хук не разбирает и не показывает — этим занимается форма
 * (`useLoginForm`), потому что часть ошибок ложится на поля, а не в баннер.
 */
export function useLogin() {
  const location = useLocation();

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: ({ accessToken }) => setAccessToken(accessToken),
  });

  return { ...mutation, redirectTo: resolveRedirect(location.state) };
}

/**
 * Куда идти после входа. `ProtectedRoute` кладёт в state роутера страницу,
 * с которой пользователя увели: `state={{ from: location }}`.
 *
 * Значение проверяется, а не берётся как есть. В state попадает что угодно —
 * его умеет подставлять и `history.pushState` с чужой страницы, — а строка
 * вида `//evil.example` для роутера выглядит внутренним путём и уводит
 * на чужой домен. Поэтому пропускается только одинарный слэш в начале.
 */
function resolveRedirect(state: unknown): To {
  const from = (state as { from?: { pathname?: unknown; search?: unknown; hash?: unknown } } | null)?.from;
  const { pathname, search, hash } = from ?? {};
  if (typeof pathname !== 'string' || !pathname.startsWith('/') || pathname.startsWith('//')) {
    return HOME_ROUTE;
  }
  // Вернуть на форму входа — то же самое, что не пустить внутрь.
  if (pathname.startsWith(LOGIN_ROUTE)) return HOME_ROUTE;
  return {
    pathname,
    search: typeof search === 'string' && search.startsWith('?') ? search : '',
    hash: typeof hash === 'string' && hash.startsWith('#') ? hash : '',
  };
}
