import type { SortingState } from '@tanstack/react-table';

/**
 * Порядок сортировки в адресе: разбор и сборка.
 *
 * Живёт рядом с номером страницы (`pageParam.ts`) и по той же причине:
 * порядок — часть адреса списка, а не состояние компонента. Ссылку
 * на «дисциплины по названию с конца» можно переслать, открыть в новой
 * вкладке и вернуться на неё кнопкой «назад»; `useState` теряет всё это.
 *
 * Форма значения — контрактная: `поле,направление` одной строкой
 * (docs/API.md, «Пагинация списков»), то есть в адресе и в запросе
 * лежит побайтово одно и то же, и переводить одно в другое не нужно.
 *
 * Сортировка **одноколоночная**: контракт допускает несколько полей
 * повторением параметра, но такой запрос требует своего сериализатора
 * (axios из массива соберёт `sort[]=`, чего Spring не поймёт), а списков,
 * которым это нужно, пока нет ни одного.
 */
export const SORT_PARAM = 'sort';

/**
 * Порядок из адреса. Всё, что не похоже на порядок, — умолчание раздела.
 *
 * Поле сверяется со списком сортируемых колонок не для красоты:
 * `?sort=password,asc` уехал бы в запрос как есть, а Spring отвечает
 * на неизвестное поле `400` — то есть чужая ссылка ломала бы страницу
 * вместо того, чтобы показать её в обычном порядке.
 */
export function parseSort(
  raw: string | null,
  sortableFields: readonly string[],
  fallback: SortingState,
): SortingState {
  if (raw === null) return fallback;

  const [field, direction] = raw.split(',');

  if (!sortableFields.includes(field)) return fallback;
  if (direction !== 'asc' && direction !== 'desc') return fallback;

  return [{ id: field, desc: direction === 'desc' }];
}

/**
 * Значение параметра для адреса и для запроса: `'name,desc'`.
 * `null` — сортировки нет, порядок оставлен на усмотрение контракта.
 */
export function sortParam(sorting: SortingState): string | null {
  const first = sorting[0];
  if (!first) return null;

  return `${first.id},${first.desc ? 'desc' : 'asc'}`;
}
