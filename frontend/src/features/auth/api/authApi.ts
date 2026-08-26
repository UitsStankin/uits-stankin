import { api, LOGIN_PATH } from '@shared/api';
import type { LoginRequest, LoginResponse, Profile } from '@shared/types';

/**
 * Две ручки аутентификации — всё, что есть в контракте.
 *
 * Тонкий слой поверх axios: только адрес, тело и разворачивание `data`.
 * Разбором ошибок занимается интерцептор (`shared/api/client.ts`), кэшем
 * и повторами — TanStack Query. Здесь нет ни того, ни другого намеренно:
 * иначе появилось бы третье место, где решается судьба 401.
 *
 * `LOGIN_PATH` берётся из api-клиента, а не пишется строкой: по нему же
 * интерцептор узнаёт форму входа, чтобы не выкидывать её на саму себя
 * при неверном пароле.
 */

const PROFILE_PATH = '/api/users/profile';

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>(LOGIN_PATH, credentials);
  return data;
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
