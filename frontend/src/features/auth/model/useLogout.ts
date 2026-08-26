import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';

import { clearToken } from '@shared/api';
import { HOME_ROUTE } from '@shared/config/routes';

/**
 * Выход. Только локальный — серверного в контракте нет.
 *
 * `AuthController` знает единственную ручку `/login`, отзыва токенов
 * на бэкенде не существует (дефект D-03 в ONBOARDING §10): выданный JWT
 * действует свои 24 часа, что бы фронт ни делал. Поэтому «выход» — это
 * забыть токен, а не сообщить о нём серверу. Кнопка, отправляющая запрос
 * в никуда, создавала бы ложное впечатление, что сессия отозвана.
 *
 * Кэш чистится целиком, как и при 401: в нём лежат ответы, полученные
 * под прежним токеном, и следующий вошедший увидел бы чужие данные
 * до первого перезапроса.
 */
export function useLogout(): () => void {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return () => {
    clearToken();
    queryClient.clear();
    // На главную, а не на форму входа: портал публичный, и вышедшему
    // есть что читать дальше. Уйти со страницы всё равно нужно — она
    // могла быть закрытой.
    void navigate(HOME_ROUTE);
  };
}
