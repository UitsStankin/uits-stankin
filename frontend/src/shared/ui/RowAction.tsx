import type { ReactNode } from 'react';

interface RowActionProps {
  /**
   * Имя кнопки целиком, вместе с записью: «Править дисциплину „Базы
   * данных“». Двадцать кнопок с именем «Править» диктор читает
   * одинаково, и выбрать из них нужную нельзя.
   */
  label: string;
  onClick: () => void;
  icon: ReactNode;
  /** `danger` — для необратимого: удаления. */
  tone?: 'default' | 'danger';
}

/**
 * Кнопка действия в строке таблицы админки — «Править», «Удалить».
 *
 * Иконка без подписи: двадцать строк по две подписи — это сорок слов,
 * из которых ни одно не помогает найти нужную строку. Имя при этом есть
 * всегда — в `aria-label` для диктора и в `title` для того, кто навёл
 * мышь и не узнал иконку.
 *
 * В `shared/ui`, а не в разделе дисциплин: те же две кнопки будут
 * в каждой таблице админки (F-43…F-46), и разошедшиеся копии — это
 * разные размеры кнопки в соседних разделах.
 */
export function RowAction({ label, onClick, icon, tone = 'default' }: RowActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={
        tone === 'danger'
          ? 'rounded p-2 text-text-muted transition-colors hover:bg-danger/10 hover:text-danger'
          : 'rounded p-2 text-text-muted transition-colors hover:bg-background-default hover:text-primary'
      }
    >
      {icon}
    </button>
  );
}
