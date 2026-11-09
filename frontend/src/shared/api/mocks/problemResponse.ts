import { HttpResponse } from 'msw';

/**
 * Ошибка ровно в том виде, в каком её отдаёт Spring, — RFC 9457 Problem
 * Details (docs/API.md, «Формат ошибок»).
 *
 * Собирается отдельной функцией, а не пишется руками в каждом хендлере:
 * `toApiError` в `shared/api/problem.ts` проверяет тело, а не приводит
 * его типом, и мок с полем `message` вместо `detail` тихо превратился бы
 * в «ошибку без текста». Тест на такой ошибке проверял бы мок, а не код.
 *
 * `timestamp` — константа, а не `new Date()`: в снапшот он не попадает,
 * зато плавающее значение делает падение теста невоспроизводимым.
 */
export function problemResponse(
  status: number,
  init: {
    title: string;
    detail: string;
    instance: string;
    /**
     * Словарь валидации `@Valid`: имя поля → сообщения. Только у ошибок
     * формы — у остальных его в ответе нет вовсе, и `undefined` уходит
     * из JSON сам, а не превращается в пустой объект. Разницу форма видит:
     * по наличию словаря она решает, раскладывать ошибки по полям
     * или показывать одним баннером.
     */
    errors?: Record<string, string[]>;
  },
) {
  return HttpResponse.json(
    {
      title: init.title,
      status,
      detail: init.detail,
      instance: init.instance,
      timestamp: '2026-08-29T12:00:00.000000+03:00',
      errors: init.errors,
    },
    {
      status,
      // Тот же тип содержимого, что у бэкенда. axios разбирает JSON
      // независимо от заголовка, но мок, врущий про формат, перестаёт
      // быть проверкой контракта.
      headers: { 'Content-Type': 'application/problem+json' },
    },
  );
}
