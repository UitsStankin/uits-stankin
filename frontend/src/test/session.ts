import type { QueryClient } from '@tanstack/react-query';

import { authKeys } from '@features/auth/api/profileQuery';
import { setAccessToken } from '@shared/api';
import { profileHandlers } from '@shared/api/mocks';
import { server } from '@shared/api/mocks/server';
import type { Profile } from '@shared/types';

import { createTestQueryClient } from './render';

/**
 * Вход в тесте: профиль в кэше, токен в сессии, тот же профиль у мока.
 *
 * Профиль кладётся в кэш до рендера — иначе `canEdit` первым кадром
 * ложен, и страница успевает отрисоваться гостевой. Хендлер всё равно
 * нужен: `useAuth` уходит за профилем фоном.
 *
 * Сессию после теста снимает вызывающий — `clearSession()` в `afterEach`:
 * токен лежит в модуле, а не в клиенте запросов, и пережил бы рендер.
 */
export function signInAs(profile: Profile, queryClient: QueryClient = createTestQueryClient()) {
  queryClient.setQueryData(authKeys.profile, profile);
  setAccessToken('test-access-token');
  server.use(...profileHandlers(profile));

  return queryClient;
}
