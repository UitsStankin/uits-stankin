import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { cn } from '@shared/lib/cn';

interface RowActionProps {
  /**
   * Имя кнопки целиком, вместе с записью: «Править дисциплину „Базы
   * данных“». Двадцать кнопок с именем «Править» диктор читает
   * одинаково, и выбрать из них нужную нельзя.
   */
  label: string;
  /** Слово на кнопке: «Править», «Удалить». Должно открывать `label`. */
  text: string;
  onClick: () => void;
  icon: ReactNode;
  /** `danger` — для необратимого: удаления. */
  tone?: 'default' | 'danger';
}

function rowActionClass(tone: 'default' | 'danger'): string {
  return cn('u-adm-act', tone === 'danger' && 'u-adm-act--danger');
}

/**
 * Кнопка действия в строке таблицы админки — «Править», «Удалить»:
 * значок и слово. Полное имя с записью лежит в `aria-label` для диктора
 * и в `title` для того, кто навёл мышь.
 *
 * В `shared/ui`, а не в разделе дисциплин: те же две кнопки стоят
 * в каждой таблице админки, и разошедшиеся копии — это разные размеры
 * кнопки в соседних разделах.
 */
export function RowAction({ label, text, onClick, icon, tone = 'default' }: RowActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={rowActionClass(tone)}
    >
      {icon}
      <span>{text}</span>
    </button>
  );
}

/** То же, что `RowAction`, но переход по адресу: ссылку можно открыть в новой вкладке. */
export function RowActionLink({
  label,
  text,
  to,
  icon,
}: {
  label: string;
  text: string;
  to: string;
  icon: ReactNode;
}) {
  return (
    <Link to={to} aria-label={label} title={label} className={rowActionClass('default')}>
      {icon}
      <span>{text}</span>
    </Link>
  );
}
