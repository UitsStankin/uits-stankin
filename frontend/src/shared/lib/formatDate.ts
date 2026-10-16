/**
 * Дата из контракта — в вид, пригодный для показа.
 *
 * Формат на входе — ISO-8601 со смещением: `2026-07-24T10:15:30.123456+04:00`
 * (docs/API.md, «Нюансы, которые из Swagger не видны»). Микросекунд в нём
 * шесть знаков, а не три: спецификация ECMAScript такого не описывает,
 * но движки лишние знаки отбрасывают, а не роняют разбор — проверено
 * на строке из контракта.
 *
 * Форматтер создаётся один раз на модуль, а не на вызов. `Intl.DateTimeFormat`
 * — дорогой конструктор, и в списке из двадцати карточек разница заметна;
 * React Compiler здесь не поможет, он мемоизирует компоненты, а не то,
 * что лежит вне их.
 *
 * Пояс намеренно не задан — берётся браузерный. Новость, опубликованная
 * в 00:30 по Москве, покажется калининградцу вчерашней, и это меньшее зло:
 * дата в чужом поясе без явной подписи «мск» вводит в заблуждение сильнее.
 */

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/**
 * «24 июля 2026 г.» либо `null`, если строку не удалось разобрать.
 *
 * `null`, а не пустая строка и не сама строка из ответа: вызывающий код
 * должен решить, что показать вместо даты, — и уж точно не «Invalid Date»,
 * которое вернул бы `toLocaleDateString` на мусоре.
 */
export function formatDate(iso: string): string | null {
  return format(iso, dateFormatter);
}

/** «24 июля 2026 г. в 09:15» — там, где важно и время публикации. */
export function formatDateTime(iso: string): string | null {
  return format(iso, dateTimeFormatter);
}

function format(iso: string, formatter: Intl.DateTimeFormat): string | null {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : formatter.format(date);
}
