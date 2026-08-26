import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

/**
 * Раскладывает словарь `errors` из ответа сервера по полям формы.
 *
 * Формат словаря задан контрактом (docs/API.md, «Формат ошибок»): имя поля →
 * список сообщений, пригодных для показа пользователю. Сообщений на одно поле
 * может быть несколько, порядок в списке не гарантирован.
 *
 * Возвращает то, что положить оказалось некуда: сообщения для полей, которых
 * в форме нет. Их обязан показать вызывающий — обычно общим баннером.
 * Молча выбрасывать нельзя: если бэкенд забракует поле, о котором форма
 * не знает, пользователь увидит форму без единой ошибки и кнопку, которая
 * «просто не работает».
 *
 * Живёт в `shared`, а не в фиче авторизации: словарь приходит от любой ручки
 * с валидацией — вход, смена пароля (F-13), формы админки (F-4x). Логики
 * конкретной формы здесь нет, только перекладывание.
 */
export function applyFieldErrors<TFieldValues extends FieldValues>(
  errors: Record<string, string[]>,
  knownFields: readonly Path<TFieldValues>[],
  setError: UseFormSetError<TFieldValues>,
): string[] {
  const homeless: string[] = [];

  for (const [field, messages] of Object.entries(errors)) {
    if (messages.length === 0) continue;

    if ((knownFields as readonly string[]).includes(field)) {
      setError(field as Path<TFieldValues>, {
        // Тип `server` отличает серверную ошибку от результата zod-проверки:
        // react-hook-form снимет её при следующей правке поля, как и свою.
        type: 'server',
        // Все сообщения, а не первое: порядок не гарантирован, и «первое»
        // ничем не лучше остальных.
        message: messages.join(' '),
      });
    } else {
      homeless.push(...messages);
    }
  }

  return homeless;
}
