import { useQuery } from '@tanstack/react-query';

import { profileQuery } from '../api/profileQuery';
import { useRestoreSession } from './useRestoreSession';
import { useAccessToken } from './useSession';

/**
 * Текущая сессия: кто вошёл и что ему можно.
 *
 * Профиль приходит из `GET /api/users/profile` через TanStack Query, а не
 * лежит в `useState`. Разница не в стиле: `useAuth` вызывают и шапка,
 * и защищённые роуты, и страницы — с состоянием в хуке каждый вызов завёл
 * бы себе отдельную копию профиля и отдельный запрос. Кэш по ключу
 * `['profile']` делает запрос один на всех, а ответ — общим.
 *
 * Запрос включается токеном, а не размонтированием: без токена ходить
 * на закрытую ручку незачем — она ответит 401. Гость на публичной странице
 * оказался бы на форме входа, ничего для этого не сделав.
 */
export function useAuth() {
  const token = useAccessToken();
  const isRestoring = useRestoreSession();
  const { data, isLoading } = useQuery({ ...profileQuery, enabled: token !== null });

  // Профиль признаётся только вместе с токеном. Между `clearSession()`
  // и очисткой кэша есть короткий промежуток, и без этой связки шапка
  // успела бы показать имя пользователя, который только что вышел.
  const profile = token !== null ? (data ?? null) : null;

  return {
    profile,
    isAuthenticated: profile !== null,
    /**
     * Про пользователя пока не известно ничего. Состояний-источников два,
     * и оба приходятся на первые миллисекунды после перезагрузки страницы:
     * идёт обмен refresh-cookie на токен либо токен уже есть, а профиль
     * ещё едет. Отличать это от «не вошёл» обязательно: иначе защищённая
     * страница на каждом F5 успевает выкинуть вошедшего на форму входа.
     *
     * Без токена запрос профиля выключен и `isLoading` равен false:
     * у выключенного запроса `fetchStatus` — `idle`, и именно этим
     * `isLoading` отличается от `isPending`, который был бы true всегда.
     */
    isLoading: isRestoring || isLoading,
    /** Модератор или суперпользователь: управление новостями и файлами. */
    canEdit: profile !== null && (profile.moderator || profile.superuser),
  };
}
