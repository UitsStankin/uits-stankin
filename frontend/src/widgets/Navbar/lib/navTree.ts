import type { NavItem } from '@shared/types';

/**
 * Совпадает ли путь пункта меню с текущим адресом.
 *
 * Не строгое равенство: у разделов есть детальные страницы, и на
 * `/about/news/42` пункт «Новости кафедры» должен оставаться активным.
 *
 * Главная — особый случай. Без отдельной ветки `pathname.startsWith('/')`
 * было бы истиной всегда, и «Главная» подсвечивалась бы на каждой странице.
 */
export function isPathActive(path: string, pathname: string): boolean {
  if (path === '/') return pathname === '/';
  return pathname === path || pathname.startsWith(`${path}/`);
}

/**
 * Есть ли внутри поддерева пункт, соответствующий текущему адресу.
 *
 * Нужно, чтобы подсвечивать раздел в навбаре: на `/about/news` активна не
 * только сама ссылка внутри выпадающего, но и «О кафедре» в верхней строке.
 */
export function containsActivePath(
  items: readonly NavItem[],
  pathname: string
): boolean {
  return items.some(
    (item) =>
      (item.path !== undefined && isPathActive(item.path, pathname)) ||
      (item.children !== undefined && containsActivePath(item.children, pathname))
  );
}
