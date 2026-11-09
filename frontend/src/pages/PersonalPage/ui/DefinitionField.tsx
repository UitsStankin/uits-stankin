import { cn } from '@shared/lib';

/**
 * Одна пара «подпись — значение» в списке определений карточки.
 *
 * Вынесена из `ProfileCard`, когда в кабинете появилась вторая карточка —
 * преподавателя (F-16): пары в них должны выглядеть одинаково и меняться
 * вместе. Живёт в слайсе страницы, а не в `shared/ui`: третьего
 * потребителя пока нет.
 *
 * Пустое значение показывается прочерком: пропущенная строка выглядела бы
 * как отсутствие такого поля вовсе.
 */
export function DefinitionField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:gap-4">
      <dt className={definitionLabelClass}>{label}</dt>
      <dd
        className={cn(
          'min-w-0 break-words text-base',
          value ? 'text-text-heading' : 'text-text-muted',
        )}
      >
        {value || '—'}
      </dd>
    </div>
  );
}

/** Класс подписи — для пар, которым нужна своя разметка значения. */
export const definitionLabelClass = 'shrink-0 text-sm text-text-muted sm:w-44';
