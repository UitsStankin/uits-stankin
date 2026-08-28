import { NewsCard } from '@entities/news';
import { cn } from '@shared/lib';
import type { News } from '@shared/types';

interface NewsListProps {
  items: readonly News[];
  hrefForItem: (id: number) => string;
  /** Едет следующая страница: список притушен и не кликается. */
  isSwitching?: boolean;
}

/**
 * Лента карточек. Чистая: получает готовый список и функцию адреса.
 *
 * Одна колонка, а не сетка: заголовки новостей разной длины, и в сетке
 * карточки в ряду выравниваются по самой высокой — половина ряда
 * оказывается пустой. Список этого лишён и лучше читается на телефоне,
 * где сетка всё равно схлопывается в него же.
 */
export function NewsList({ items, hrefForItem, isSwitching = false }: NewsListProps) {
  return (
    <ul
      className={cn(
        'flex flex-col gap-gutter-sm transition-opacity',
        // Клики блокируются вместе с притушиванием: без этого можно успеть
        // открыть карточку, которая уже уехала с экрана.
        isSwitching && 'pointer-events-none opacity-50',
      )}
      // Диктору сообщается, что список сейчас обновляется, — иначе он
      // прочитает старые заголовки как актуальные.
      aria-busy={isSwitching}
    >
      {items.map((news) => (
        <li key={news.id}>
          <NewsCard news={news} href={hrefForItem(news.id)} />
        </li>
      ))}
    </ul>
  );
}
