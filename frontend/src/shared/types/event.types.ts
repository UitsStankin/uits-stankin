import type { UserDirectoryEntry } from './auth.types';

/**
 * Календарь событий — `/api/events` (docs/API.md, «Календарь событий»).
 *
 * Сверено с `UserEventResponseDto` бэкенда. Раздел открыт администратору
 * и преподавателю, модератору — нет; событие видят только владелец
 * и назначенные, администратор чужих не видит.
 */

/** Ход работы по событию. Словарь закрытый, латиницей в верхнем регистре. */
export type EventStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

/**
 * Частота напоминаний. Принимается и хранится, но **ничего не делает**:
 * планировщик и бот сняты (ARCHITECTURE.md §8, п. 14).
 */
export type NotificationFrequency = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';

/**
 * Владелец или назначенный — `EventUserDto`: `id` учётки и ФИО, без логина.
 *
 * Форма та же, что у записи справочника учёток (`GET /api/users/directory`),
 * и это не совпадение: назначенных форма берёт оттуда, а сравнивает
 * по `id`. Отдельный тип с теми же тремя полями разошёлся бы со справочником
 * при первой правке одного из них. Обе строки ФИО бывают `null`.
 */
export type EventPerson = UserDirectoryEntry;

/**
 * Событие в ответе — и в списке (`content[]`), и поштучно.
 *
 * **Моменты, а не даты.** `startedAt` и `endedAt` — ISO-8601 со смещением.
 * У события «весь день» оба — полночь, и `endedAt` — полночь **последнего**
 * дня, а не следующего за ним: так их писал старый портал
 * (`startOfDay(end)`), и так лежат перенесённые данные. Конец включительный.
 */
export type UserEvent = {
  id: number;
  name: string;
  /** Необязательно — `null` или пустая строка. Простой текст, не HTML. */
  description: string | null;
  startedAt: string;
  endedAt: string;
  allDay: boolean;
  /** `#RRGGBB` — бэкенд принимает только такой вид. */
  color: string;
  status: EventStatus;
  notificationFrequency: NotificationFrequency;
  /** Только для чтения и сейчас ничем не заполняется. */
  nextNotificationAt: string | null;
  owner: EventPerson;
  assignedUsers: readonly EventPerson[];
};
