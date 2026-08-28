import { api, LOGIN_PATH, LOGOUT_PATH } from '@shared/api';
import type { AccessTokenResponse, LoginRequest, Profile } from '@shared/types';

/**
 * Ручки аутентификации, которые зовёт прикладной код.
 *
 * Тонкий слой поверх axios: только адрес, тело и разворачивание `data`.
 * Разбором ошибок занимается интерцептор (`shared/api/client.ts`), кэшем
 * и повторами — TanStack Query. Здесь нет ни того, ни другого намеренно:
 * иначе появилось бы третье место, где решается судьба 401.
 *
 * Третьей ручки блока — `refresh` — здесь нет, и это не пропуск. Обмен
 * зовёт интерцептор, у него же живёт очередь на один обмен для всех
 * запросов сразу, а обходной путь мимо очереди ротировал бы refresh-токен
 * вторым потоком (`shared/api/client.ts`, `refreshAccessToken`).
 *
 * Адреса берутся из api-клиента, а не пишутся строкой: по ним же
 * интерцепторы узнают блок `auth` — не приложить к нему `Authorization`
 * и не отвечать на его 401 обменом.
 */

const PROFILE_PATH = '/api/users/profile';

export async function login(credentials: LoginRequest): Promise<AccessTokenResponse> {
  const { data } = await api.post<AccessTokenResponse>(LOGIN_PATH, credentials);
  return data;
}

/**
 * Выход на сервере: гасит всю цепочку refresh-токенов этой сессии
 * и стирает cookie. Тела нет — сервер узнаёт сессию по той же cookie,
 * которую браузер приложит сам.
 *
 * Ответ — `204` без тела, поэтому возвращать нечего.
 */
export async function logout(): Promise<void> {
  await api.post(LOGOUT_PATH);
}

/**
 * Профиль текущего пользователя. `signal` приходит от TanStack Query
 * и отменяет запрос, когда он перестал быть нужен: без него уход
 * со страницы оставлял бы висеть ответ, который уже некуда девать.
 */
export async function fetchProfile(signal?: AbortSignal): Promise<Profile> {
  const { data } = await api.get<Profile>(PROFILE_PATH, { signal });
  return data;
}
