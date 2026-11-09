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

/**
 * Порядок по дате создания: новые сверху, если параметра нет, — как
 * `@PageableDefault(sort = {"createdAt", "id"}, direction = DESC)`
 * у новостей, конференций и достижений. `?sort=createdAt,asc` его
 * переворачивает; других полей сюда не приходит: у всех трёх разделов
 * админки сортируется одна колонка — дата, а публичные списки порядка
 * не выбирают вовсе и зовут функцию с `null`.
 *
 * Сравниваются моменты, а не строки. Строкой сравнивать нельзя: даты
 * в фикстурах со смещением `+03:00`, а созданная запись получает
 * `toISOString()` с `Z`, и лексикографически «10:15+03:00» больше,
 * чем «09:00Z», хотя произошло раньше.
 *
 * Жила в моке новостей (F-43) и переехала сюда с F-45, когда изменяемыми
 * стали ещё два мока: три копии разошлись бы ровно на этой ловушке.
 */
export function sortByCreatedAt<T extends { createdAt: string }>(
  items: readonly T[],
  sort: string | null,
): T[] {
  const asc = sort === 'createdAt,asc';

  return [...items].sort(
    (a, b) => (asc ? 1 : -1) * (Date.parse(a.createdAt) - Date.parse(b.createdAt)),
  );
}
