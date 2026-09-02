import { DEFAULT_AVATAR_URL } from '@shared/config/avatar';
import { cn } from '@shared/lib';
import type { Helper } from '@shared/types';

import { helperFullName } from '../lib/helperPresenters';

interface HelperCardProps {
  helper: Helper;
  className?: string;
}

/**
 * Карточка сотрудника УВП в списке. Чистая: ни состояния, ни запросов —
 * только карточка контракта.
 *
 * Раскладка повторяет `TeacherCard` — круглое фото сверху, подписи
 * под ним, — но карточка **не ссылка**: детальной страницы у УВП нет,
 * вся карточка контракта видна прямо здесь. Поэтому нет ни растянутой
 * ссылки, ни тени по наведению — они обещали бы клик, за которым ничего
 * не стоит.
 */
export function HelperCard({ helper, className }: HelperCardProps) {
  return (
    <article
      className={cn(
        'flex h-full flex-col items-center gap-3 rounded bg-white p-5 text-center shadow-sm',
        className,
      )}
    >
      <img
        src={helper.avatarUrl ?? DEFAULT_AVATAR_URL}
        // Фото декоративное: имя стоит рядом текстом, и «фото Кузнецовой»
        // диктор прочитал бы дважды.
        alt=""
        aria-hidden
        // Двадцать карточек — двадцать фотографий; без lazy они уезжают
        // в сеть все разом ещё до первого экрана.
        loading="lazy"
        className="h-28 w-28 shrink-0 rounded-full object-cover"
      />

      <h3 className="text-h5 text-text-heading">{helperFullName(helper)}</h3>

      <p className="text-base text-text-muted">{helper.position}</p>
    </article>
  );
}
