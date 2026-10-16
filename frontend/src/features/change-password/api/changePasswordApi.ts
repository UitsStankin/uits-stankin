import { api } from '@shared/api';
import type { ChangePasswordRequest } from '@shared/types';

/**
 * Смена собственного пароля — единственная ручка фичи.
 *
 * Тонкий слой поверх axios, как и в `features/auth`: только адрес и тело.
 * Разбор ошибок делает интерцептор, кэш и состояние запроса — TanStack Query.
 */

const CHANGE_PASSWORD_PATH = '/api/users/change-password';

/**
 * Успех — `200` с пустым телом, поэтому возвращать нечего: сервер ничего
 * не сообщает о пользователе после смены, и придумывать ответ («true»,
 * «обновлённый профиль») означало бы выдумывать контракт.
 */
export async function changePassword(request: ChangePasswordRequest): Promise<void> {
  await api.post(CHANGE_PASSWORD_PATH, request);
}
