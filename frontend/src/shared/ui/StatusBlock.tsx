import type { ReactNode } from 'react';
import { Inbox, TriangleAlert, type LucideIcon } from 'lucide-react';

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
  /** Значок над заголовком. По умолчанию — «пусто» либо «сбой», по тону. */
  icon?: LucideIcon;
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
 *
 * Значок и крупный заголовок — оформление нового дизайна: они видны только
 * в `.u-themed`, то есть везде, кроме админки. Там блок остаётся таким, каким
 * был, — карточкой с одним заголовком.
 */
export default function StatusBlock({
  title,
  description,
  action,
  tone = 'neutral',
  icon,
  className,
}: StatusBlockProps) {
  const Icon = icon ?? (tone === 'danger' ? TriangleAlert : Inbox);

  return (
    <div
      role={tone === 'danger' ? 'alert' : undefined}
      className={cn(
        'u-empty flex flex-col items-center gap-3 rounded bg-surface px-6 py-12 text-center shadow-sm',
        tone === 'danger' && 'u-empty--danger',
        className,
      )}
    >
      <span className="u-empty-icon" aria-hidden>
        <Icon size={26} />
      </span>

      <p className={cn('u-empty-title text-h5', tone === 'danger' ? 'text-danger' : 'text-text-heading')}>
        {title}
      </p>

      {description && <p className="max-w-prose text-base text-text-muted">{description}</p>}

      {action}
    </div>
  );
}
