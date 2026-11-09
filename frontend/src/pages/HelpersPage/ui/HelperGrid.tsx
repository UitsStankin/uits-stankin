import { HelperCard } from '@entities/helper';
import { cn } from '@shared/lib';
import type { Helper } from '@shared/types';

interface HelperGridProps {
  helpers: readonly Helper[];
  /** Едет следующая страница: сетка притушена. */
  isSwitching?: boolean;
}

/**
 * Сетка карточек УВП. Чистая: получает готовый список.
 *
 * Сетка, а не колонка, по той же причине, что у ППС: фото, имя
 * и должность в одну колонку растянули бы страницу на два экрана
 * пустоты. В оригинале список был плоским — но и пагинации там не было,
 * раздел целиком помещался на экран; здесь раскладка идёт за шаблоном
 * F-21, а не за старой вёрсткой.
 *
 * `pointer-events-none` на время перелистывания, как у ППС, не нужен —
 * кликать в карточках нечего. А вот `aria-busy` остаётся: диктору
 * сообщается, что список обновляется, иначе он прочитает старые имена
 * как актуальные.
 */
export function HelperGrid({ helpers, isSwitching = false }: HelperGridProps) {
  return (
    <ul
      className={cn(
        'grid grid-cols-1 gap-gutter-sm transition-opacity sm:grid-cols-2 lg:grid-cols-3',
        isSwitching && 'opacity-50',
      )}
      aria-busy={isSwitching}
    >
      {helpers.map((helper) => (
        <li key={helper.id}>
          <HelperCard helper={helper} />
        </li>
      ))}
    </ul>
  );
}
