import { Link } from 'react-router';

import { cn } from '@shared/lib';

export interface LinkFilterOption<T> {
  value: T;
  /** Подпись пункта — во множественном числе: пункт называет набор записей. */
  label: string;
}

interface LinkFilterProps<T> {
  /** Имя навигации для диктора: «Тип записи», «Состояние карточки». */
  label: string;
  options: readonly LinkFilterOption<T>[];
  /** Что показано сейчас. Сравнивается строго — `null` тоже значение. */
  current: T;
  hrefFor: (value: T) => string;
}

/**
 * Отбор списка в админке — ряд ссылок, активная подсвечена. Чистый: адреса
 * собирает страница, активный пункт приходит пропсом.
 *
 * **Ссылки, а не кнопки** — по той же причине, что и у пагинатора:
 * отбор живёт в адресе, значит его можно переслать, открыть в новой
 * вкладке и вернуться к нему кнопкой «назад».
 *
 * Отбирать обязан **бэкенд**: `totalElements` и `totalPages` он считает
 * с учётом отбора, и отбор двадцати загруженных строк на клиенте уменьшил
 * бы таблицу, оставив пагинатор обещать страницы, которых нет.
 *
 * Жил отбором по типу в разделе новостей (F-43) и переехал сюда со вторым
 * потребителем — архивом карточек ППС (F-53).
 */
export function LinkFilter<T>({ label, options, current, hrefFor }: LinkFilterProps<T>) {
  return (
    <nav aria-label={label}>
      <ul className="flex flex-wrap gap-1">
        {options.map((option) => {
          const isActive = option.value === current;

          return (
            <li key={option.label}>
              <Link
                to={hrefFor(option.value)}
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
                {option.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
