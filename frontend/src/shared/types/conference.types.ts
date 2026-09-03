/**
 * Объявления о научных конференциях — по контракту T-28 (docs/API.md,
 * «Конференции»).
 *
 * В оригинале это был класс `ConferenceAnnouncement` в `planned.types.ts`
 * с полями-`string` и флагом `is_hidden`. Модуль появился на бэкенде — тип
 * сверен со Swagger и переехал сюда по правилу из шапки того файла. Против
 * старой модели изменились две вещи, обе — решением контракта: `is_hidden`
 * заменён на `display` с обратным смыслом (соглашение о видимости одно
 * на все сущности), а все необязательные поля стали nullable.
 *
 * Разделения «список — деталь» нет: обе ручки отдают один и тот же DTO,
 * то есть `content` объявления приезжает уже в списке — как у новостей.
 */

import type { Page } from './api.types';

/** Объявление о конференции — ответ `GET /api/(public/)conferences[/{id}]`. */
export type Conference = {
  id: number;
  title: string;
  /** Краткое описание для карточки в списке. */
  description: string | null;
  /**
   * Календарная дата начала `YYYY-MM-DD` — без времени и без смещения зоны.
   * Это сознательно: конференция проходит «14 октября» по местному времени
   * площадки, а не в момент на шкале UTC. Разбирать её через `new Date(iso)`
   * нельзя — тот считает голую дату полуночью UTC, и западнее Гринвича
   * показалось бы 13 октября (`entities/conference/lib/conferenceDates.ts`).
   */
  startDate: string | null;
  /**
   * Дата окончания `YYYY-MM-DD`. У однодневной конференции — `null`,
   * и это единственное её представление: `endDate`, присланный равным
   * `startDate`, при сохранении нормализуется в `null`, так что проверять
   * равенство дат при рендере не нужно.
   */
  endDate: string | null;
  /** Время начала `HH:mm` — всегда с точностью до минуты, секунды отброшены. */
  time: string | null;
  organizer: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  /**
   * Rich-text, HTML — единственное такое поле объявления; остальные строки
   * плоские и выводятся текстовым узлом. Содержимое, вычищенное
   * санитайзером до пустоты, сохраняется как `null`: у «пустого» `content`
   * одно представление, а не два — поэтому здесь он nullable,
   * в отличие от новости.
   */
  content: string | null;
  /**
   * Ключ файла обложки в хранилище. Уходит обратно при сохранении,
   * для показа не годится — для этого есть `previewImageUrl`.
   */
  previewImage: string | null;
  /** Готовый адрес обложки для `<img src>`, относительный. */
  previewImageUrl: string | null;
  /** Текст для `alt` обложки. */
  previewImageDescription: string | null;
  /** ISO-8601 со смещением — в отличие от дат проведения. */
  createdAt: string;
  /**
   * Опубликовано ли. В публичной выдаче всегда `true` — скрытые объявления
   * оттуда не приходят вовсе, и по прямой ссылке дают `404`, а не `403`.
   * Поле нужно админскому списку, чтобы отличать черновики.
   */
  display: boolean;
};

/**
 * Тело `POST /api/conferences` и `PUT /api/conferences/{id}` — те же поля
 * без `id`, `createdAt` и `previewImageUrl`.
 *
 * `PUT` — полная замена: не пришедшее в теле поле обнуляется, поэтому
 * необязательных полей здесь нет, а «не задано» выражается через `null`.
 * Обязательны только `title` (до 255 символов) и `display` — тело без
 * `display` даёт `400`, а не молча скрытое объявление.
 *
 * Валидация связки дат — на бэкенде: `endDate` и `time` без `startDate` —
 * `400`, `endDate` раньше `startDate` — тоже `400`; сообщения приходят
 * в `errors` под ключами `endDate` и `time`. Лимиты строк: `organizer` —
 * 255, `contactEmail` — 254, `contactPhone` — 32,
 * `previewImageDescription` — 256; `description` и `content` не ограничены.
 */
export type ConferenceRequest = {
  title: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  time: string | null;
  organizer: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  content: string | null;
  /** Ключ файла из `POST /api/files` с категорией `news`, не адрес. */
  previewImage: string | null;
  previewImageDescription: string | null;
  display: boolean;
};

/** Страница объявлений — то, что отдают списочные ручки. Новые сверху. */
export type ConferencePage = Page<Conference>;
