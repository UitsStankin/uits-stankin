import { Link } from 'react-router';

import { cn } from '@shared/lib';

interface FilterLinksProps<T extends string> {
  /** Имя группы для диктора: «Роль», «Состояние». */
  label: string;
  current: T | null;
  options: readonly { value: T | null; label: string }[];
  hrefFor: (value: T | null) => string;
}

/**
 * Отбор ссылками — как у новостей (`PostTypeFilter`): отбор живёт в адресе,
 * и его пересылают, открывают в новой вкладке и возвращаются к нему
 * «назад». Отбирает бэкенд — `totalElements` он считает с учётом отбора.
 */
export function FilterLinks<T extends string>({
  label,
  current,
  options,
  hrefFor,
}: FilterLinksProps<T>) {
  return (
    <nav aria-label={label}>
      <ul className="flex flex-wrap gap-1">
        {options.map((option) => {
          const isActive = option.value === current;

          return (
            <li key={option.label}>
              <Link
                to={hrefFor(option.value)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'block rounded px-3 py-1.5 text-base transition-colors',
                  isActive
                    ? 'bg-primary font-bold text-white'
                    : 'bg-white text-text-default hover:bg-secondary',
                )}
              >
                {option.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
