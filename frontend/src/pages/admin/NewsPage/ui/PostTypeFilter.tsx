import { Link } from 'react-router';

import { cn } from '@shared/lib';
import type { PostType } from '@shared/types';

interface PostTypeFilterProps {
  /** Что показано сейчас; `null` — оба типа. */
  current: PostType | null;
  hrefForType: (type: PostType | null) => string;
}

/**
 * Подписи фильтра — во множественном числе: он называет не запись,
 * а набор записей. Поэтому здесь свой список, а не `postTypeLabel`
 * из сущности: та отвечает на вопрос «что это за запись» и даёт
 * «Новость», что для кнопки отбора неверно.
 */
const OPTIONS: readonly { type: PostType | null; label: string }[] = [
  { type: null, label: 'Все' },
  { type: 'news', label: 'Новости' },
  { type: 'announcements', label: 'Объявления' },
];

/**
 * Отбор по типу записи. Чистый: адреса собирает страница, активный
 * пункт приходит пропсом.
 *
 * **Ссылки, а не кнопки** — по той же причине, что и у пагинатора:
 * фильтр живёт в адресе, значит его можно переслать, открыть в новой
 * вкладке и вернуться к нему кнопкой «назад».
 *
 * Отбор делает **бэкенд**: `totalElements` и `totalPages` он считает
 * с учётом фильтра, и отбор двадцати загруженных строк на клиенте
 * уменьшил бы таблицу, оставив пагинатор обещать страницы, которых нет
 * (docs/API.md, «Новости: фильтр по типу записи»).
 */
export function PostTypeFilter({ current, hrefForType }: PostTypeFilterProps) {
  return (
    <nav aria-label="Тип записи">
      <ul className="flex flex-wrap gap-1">
        {OPTIONS.map(({ type, label }) => {
          const isActive = type === current;

          return (
            <li key={label}>
              <Link
                to={hrefForType(type)}
                // Диктору активный пункт объявляется текущим, а не просто
                // подсвечивается: цвет ему не виден.
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'block rounded px-3 py-1.5 text-base transition-colors',
                  isActive
                    ? 'bg-primary font-bold text-white'
                    : 'bg-white text-text-default hover:bg-secondary',
                )}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
