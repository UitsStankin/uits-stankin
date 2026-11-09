import { Search, X } from 'lucide-react';

import { cn } from '@shared/lib';

interface UserSearchProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  /** Сколько нашлось; `null` — отбора нет или ответа ещё не было. */
  foundCount: number | null;
}

/**
 * Поиск по учёткам. Разметка — как у поиска аспирантов (там же разбор,
 * зачем свой крестик и почему подпись скрыта); пауза перед запросом
 * живёт в `useUrlSearch`.
 */
export function UserSearch({ value, onChange, onClear, foundCount }: UserSearchProps) {
  return (
    <div role="search" className="flex flex-col gap-1.5">
      <label htmlFor="user-search" className="sr-only">
        Поиск учётных записей
      </label>

      <div className="relative">
        <Search
          size={16}
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-muted"
        />

        <input
          id="user-search"
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Логин, имя, фамилия или почта"
          className={cn(
            'w-full rounded border border-gray-300 bg-white py-2 pr-10 pl-9',
            'text-base text-text-default transition-colors placeholder:text-text-muted',
            'focus:border-primary focus:ring-0',
            '[&::-webkit-search-cancel-button]:appearance-none',
            '[&::-webkit-search-decoration]:appearance-none',
          )}
        />

        {value !== '' && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Очистить поиск"
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1.5 text-text-muted transition-colors hover:text-text-default"
          >
            <X size={16} aria-hidden />
          </button>
        )}
      </div>

      <p role="status" className="min-h-5 text-sm text-text-muted">
        {foundCount !== null && `Найдено учётных записей: ${foundCount}`}
      </p>
    </div>
  );
}
