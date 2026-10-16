import type { Page } from '@shared/types';

/** Размер страницы по умолчанию — из контракта, а не из головы. */
export const DEFAULT_PAGE_SIZE = 20;

/**
 * Страница списка по правилам Spring: `content` — срез, счётчики считаются
 * по всей выборке, а не по срезу.
 *
 * Страница за пределами данных — это `200` с пустым `content`, а не `404`
 * (docs/API.md, «Пагинация списков»). Именно на этом различии стоит ветка
 * «такой страницы нет» в моделях списков, и мок, отвечающий здесь ошибкой,
 * проверял бы несуществующее поведение.
 *
 * Общая на все списочные ручки: у новостей, ППС и всего блока 2 обёртка
 * одна и та же, и разойтись копиям тут значит проверять разную пагинацию
 * в соседних тестах.
 */
export function pageResponse<T>(
  items: readonly T[],
  page = 0,
  size = DEFAULT_PAGE_SIZE,
): Page<T> {
  return {
    content: items.slice(page * size, page * size + size),
    page,
    size,
    totalElements: items.length,
    totalPages: Math.ceil(items.length / size),
  };
}

/**
 * Числовой query-параметр или умолчание контракта.
 *
 * Отсутствие параметра проверяется отдельной строкой, а не через `Number`:
 * `Number(null)` — это ноль, целое и неотрицательное, то есть проверка
 * пропустила бы его как заданный размер страницы. Ровно на этом мок
 * новостей и отдавал пустой список при живых двадцати трёх записях.
 */
export function numberParam(url: URL, name: string, fallback: number, min = 0): number {
  const raw = url.searchParams.get(name);
  if (raw === null) return fallback;

  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= min ? parsed : fallback;
}

/** Страница из адреса запроса: `?page=` и `?size=` по правилам контракта. */
export function pageFromUrl<T>(items: readonly T[], url: URL): Page<T> {
  return pageResponse(
    items,
    numberParam(url, 'page', 0),
    numberParam(url, 'size', DEFAULT_PAGE_SIZE, 1),
  );
}
