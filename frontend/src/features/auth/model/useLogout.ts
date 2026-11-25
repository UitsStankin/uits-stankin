import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';

import { clearSession } from '@shared/api';
import { HOME_ROUTE } from '@shared/config/routes';
import { discardUnsavedChanges, hasUnsavedChanges } from '@shared/lib';

import { logout } from '../api/authApi';

/**
 * Выход — теперь настоящий, а не только локальный.
 *
 * `POST /api/users/auth/logout` гасит всю цепочку refresh-токенов сессии
 * на сервере и стирает cookie (T-30, дефект D-03). До него отзыва
 * не существовало: выданный JWT действовал свои сутки, что бы фронт
 * ни делал, и кнопка «Выход» лишь забывала токен.
 *
 * Ответа не ждём. Сессия гасится с двух сторон, и вторая половина
 * не должна зависеть от первой: обрыв связи оставил бы пользователя
 * в интерфейсе, из которого он попросил выйти. Ошибку глотаем осознанно —
 * показывать её некому и делать с ней нечего, а без `catch` она стала бы
 * необработанным промисом в консоли.
 *
 * Кэш чистится целиком: в нём лежат ответы, полученные под прежним токеном,
 * и следующий вошедший увидел бы чужие данные до первого перезапроса.
 */
export function useLogout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isConfirming, setConfirming] = useState(false);

  function confirmLogout() {
    setConfirming(false);
    discardUnsavedChanges();
    void logout().catch(() => undefined);

    // Сначала закрываем защищённый экран, чтобы при очистке сессии
    // его проверка доступа не перенаправила пользователя на вход.
    void navigate(HOME_ROUTE, { replace: true, flushSync: true });
    clearSession();
    queryClient.clear();
  }

  function requestLogout() {
    if (hasUnsavedChanges()) setConfirming(true);
    else confirmLogout();
  }

  return {
    isConfirming,
    requestLogout,
    confirmLogout,
    cancelLogout: () => setConfirming(false),
  };
}
