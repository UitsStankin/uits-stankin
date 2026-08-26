import { useMutation } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router';

import { setToken } from '@shared/api';
import { HOME_ROUTE, LOGIN_ROUTE } from '@shared/config/routes';

import { login } from '../api/authApi';

/**
 * Вход: логин и пароль → токен → переход туда, откуда пришли.
 *
 * Профиль здесь не запрашивается. Он подтянется сам: `setToken` рассылает
 * изменение, `useAuth` в шапке видит токен и включает свой запрос. Тянуть
 * профиль ещё и отсюда значило бы завести второй путь к тому же ответу.
 *
 * Ошибку хук не разбирает и не показывает — этим занимается форма
 * (`useLoginForm`), потому что часть ошибок ложится на поля, а не в баннер.
 */
export function useLogin() {
  const navigate = useNavigate();
  const location = useLocation();

  return useMutation({
    mutationFn: login,
    onSuccess: ({ accessToken }) => {
      setToken(accessToken);
      // `replace`, чтобы кнопка «назад» не возвращала на форму входа:
      // вошедшего она тут же отправит обратно, и получится ловушка.
      void navigate(resolveRedirect(location.state), { replace: true });
    },
  });
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
function resolveRedirect(state: unknown): string {
  const from = (state as { from?: { pathname?: unknown } } | null)?.from?.pathname;

  if (typeof from !== 'string') return HOME_ROUTE;
  if (!from.startsWith('/') || from.startsWith('//')) return HOME_ROUTE;
  // Вернуть на форму входа — то же самое, что не пустить внутрь.
  if (from.startsWith(LOGIN_ROUTE)) return HOME_ROUTE;

  return from;
}
