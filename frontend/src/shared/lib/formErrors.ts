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

/**
 * Снимает со словаря `errors` сообщения тех полей, которых в форме нет,
 * но которым есть где показаться.
 *
 * Такие поля у портала есть, и это не небрежность формы: ключ фото,
 * набор отмеченных дисциплин и выбранная учётная запись — не поля ввода,
 * они живут в состоянии хука (разбор в `features/manage-teachers`).
 * `setError` react-hook-form на них не наведёшь, а показать сообщение
 * рядом с тем, что править, надо — под рамкой фото, под списком, под
 * выпадающим списком.
 *
 * Возвращает пару: снятое (по одному сообщению на поле, как и у
 * `applyFieldErrors`) и остаток словаря — его вызывающий отдаёт
 * `applyFieldErrors`, а что не легло и туда, показывает баннером.
 *
 * Порядок именно такой — сначала снять, потом разложить: иначе поле,
 * которого в форме нет, уехало бы в «бездомные» и показалось бы
 * баннером **вдобавок** к сообщению под собой. `detail` у таких отказов
 * повторяет текст дословно (docs/API.md, «Формат ошибок»), и человек
 * увидел бы одно и то же дважды.
 */
export function takeFieldErrors<K extends string>(
  errors: Record<string, string[]>,
  fields: readonly K[],
): { taken: Partial<Record<K, string>>; rest: Record<string, string[]> } {
  const taken: Partial<Record<K, string>> = {};
  const rest: Record<string, string[]> = {};

  for (const [field, messages] of Object.entries(errors)) {
    if (messages.length === 0) continue;

    if ((fields as readonly string[]).includes(field)) {
      // Все сообщения, а не первое: порядок в списке не гарантирован.
      taken[field as K] = messages.join(' ');
    } else {
      rest[field] = messages;
    }
  }

  return { taken, rest };
}
