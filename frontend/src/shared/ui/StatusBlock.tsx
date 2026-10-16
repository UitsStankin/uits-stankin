import type { ReactNode } from 'react';

import { cn } from '@shared/lib';

interface StatusBlockProps {
  title: string;
  description?: string | null;
  /** Кнопка «повторить» или ссылка «ко всем новостям» — что уместно. */
  action?: ReactNode;
  /**
   * `danger` — только для сбоя: у него другой цвет и `role="alert"`,
   * то есть диктор прочитает его сразу, не дожидаясь табуляции.
   * У пустого списка ничего не сломалось, тревожить незачем.
   */
  tone?: 'neutral' | 'danger';
  className?: string;
}

/**
 * Экран вместо содержимого: «ничего не нашлось», «не удалось загрузить»,
 * «страницы не существует».
 *
 * Живёт в `shared/ui` по той же причине, что и пагинатор: F-14 — эталонный
 * модуль, и те же три состояния предстоит показать восьми списочным
 * страницам блока 2. Каждая из них, написанная отдельно, разошлась бы
 * и по вёрстке, и по формулировкам.
 */
export default function StatusBlock({
  title,
  description,
  action,
  tone = 'neutral',
  className,
}: StatusBlockProps) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : undefined}
      className={cn(
        'flex flex-col items-center gap-3 rounded bg-white px-6 py-12 text-center shadow-sm',
        className,
      )}
    >
      <p className={cn('text-h5', tone === 'danger' ? 'text-danger' : 'text-text-heading')}>
        {title}
      </p>

      {description && <p className="max-w-prose text-base text-text-muted">{description}</p>}

      {action}
    </div>
  );
}
