import { api } from '@shared/api';
import type { UserEvent, UserEventRequest } from '@shared/types';

/**
 * Создание, правка и удаление события календаря — `POST`, `PUT`
 * и `DELETE /api/events`.
 *
 * Лежит в фиче, а не в сущности: сущность знает только чтение — та же
 * граница, что у конференций (`features/manage-conferences`). Путь
 * повторён строкой по той же причине, что там.
 *
 * Править и удалять может владелец и любой назначенный (docs/API.md,
 * «Календарь событий»), то есть всякий, кто событие видит. Чужое даёт
 * `404`, а не `403`.
 */
const EVENTS_PATH = '/api/events';

/** Ответ — созданное событие (`201`); `Location` не нужен, тело несёт всё. */
export async function createEvent(body: UserEventRequest): Promise<UserEvent> {
  const { data } = await api.post<UserEvent>(EVENTS_PATH, body);

  return data;
}

/**
 * Правка — **полная замена**, включая назначенных: пустой
 * `assignedUserIds` снимает всех. Поэтому форма шлёт все поля,
 * и частоту напоминаний, которой не показывает, — ту, что пришла.
 */
export async function updateEvent(id: number, body: UserEventRequest): Promise<UserEvent> {
  const { data } = await api.put<UserEvent>(`${EVENTS_PATH}/${String(id)}`, body);

  return data;
}

/** Удаление: `204` без тела, отмены в контракте нет. */
export async function deleteEvent(id: number): Promise<void> {
  await api.delete(`${EVENTS_PATH}/${String(id)}`);
}
