import { api } from '@shared/api';
import type {
  AdminUser,
  PasswordResetRequest,
  UserCreateRequest,
  UserUpdateRequest,
} from '@shared/types';

/**
 * Действия админа над учётными записями — `POST`/`PUT /api/users`, сброс
 * пароля и завершение сессий.
 *
 * Лежит в фиче, а не в сущности: сущность знает только чтение — та же
 * граница, что у новостей и конференций. Удаления здесь нет и не будет:
 * его нет в контракте, закрывают доступ блокировкой (docs/API.md,
 * «Учётные записи (админ)»).
 */
const USERS_PATH = '/api/users';

/** Ответ — `201` и созданная учётка; `Location` не нужен, тело несёт всё. */
export async function createUser(body: UserCreateRequest): Promise<AdminUser> {
  const { data } = await api.post<AdminUser>(USERS_PATH, body);

  return data;
}

/**
 * Правка — **полная замена**: необязательное поле, которого в теле нет,
 * очищается. Поэтому форма отправляет все поля, включая незатронутые.
 */
export async function updateUser(id: number, body: UserUpdateRequest): Promise<AdminUser> {
  const { data } = await api.put<AdminUser>(`${USERS_PATH}/${id}`, body);

  return data;
}

/**
 * Новый пароль без старого — админ его не знает. `204` без тела; заодно
 * обрываются все открытые сессии учётки.
 */
export async function resetPassword(id: number, body: PasswordResetRequest): Promise<void> {
  await api.post(`${USERS_PATH}/${id}/reset-password`, body);
}

/** Оборвать открытые сессии, пароль не трогая. `204` без тела. */
export async function terminateSessions(id: number): Promise<void> {
  await api.post(`${USERS_PATH}/${id}/logout`);
}
