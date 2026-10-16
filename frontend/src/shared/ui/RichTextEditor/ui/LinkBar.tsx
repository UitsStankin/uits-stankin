import type { KeyboardEvent } from 'react';

import { cn } from '@shared/lib';

import { barActionClass } from './barActionClass';

interface LinkBarProps {
  /** Идентификатор поля адреса: к нему цепляются подпись и текст отказа. */
  id: string;
  href: string;
  /** Отказ разбора адреса; `null` — отказа нет. */
  error: string | null;
  /** Курсор стоит в ссылке — показывать «Убрать». */
  canRemove: boolean;
  onHrefChange: (href: string) => void;
  onApply: () => void;
  onRemove: () => void;
  onCancel: () => void;
}

/**
 * Строка ввода адреса ссылки. Чистая: всё приходит пропсами.
 *
 * Не `<form>` и не `<dialog>`: поле редактора стоит внутри формы записи,
 * вложенная форма — невалидная разметка, а модальное окно ради одного
 * поля отбирает у человека возможность посмотреть на текст, к которому
 * он вешает ссылку.
 *
 * Цена этого решения — Enter: в поле внутри формы он отправляет форму,
 * то есть сохранил бы запись вместо того, чтобы поставить ссылку.
 * Поэтому он перехвачен.
 */
export function LinkBar({
  id,
  href,
  error,
  canRemove,
  onHrefChange,
  onApply,
  onRemove,
  onCancel,
}: LinkBarProps) {
  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      onApply();
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
    }
  }

  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-1.5 border-b border-default bg-light px-2 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={id} className="text-sm font-bold text-text-heading">
          Адрес
        </label>

        <input
          id={id}
          type="text"
          value={href}
          onChange={(event) => onHrefChange(event.target.value)}
          onKeyDown={onKeyDown}
          // Строка появляется по нажатию кнопки и живёт до Escape или
          // «Отмены»: курсор ставится сразу, иначе после клика по кнопке
          // пришлось бы целиться в поле мышью.
          autoFocus
          placeholder="https://stankin.ru или /about/news"
          aria-invalid={error !== null}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'min-w-0 flex-1 rounded border border-gray-300 bg-white px-2 py-1',
            'text-base text-text-default placeholder:text-text-muted',
            'focus:border-primary focus:ring-0 aria-invalid:border-danger',
          )}
        />

        <button type="button" onClick={onApply} className={barActionClass}>
          Применить
        </button>

        {canRemove && (
          <button type="button" onClick={onRemove} className={barActionClass}>
            Убрать
          </button>
        )}

        <button type="button" onClick={onCancel} className={barActionClass}>
          Отмена
        </button>
      </div>

      {error && (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
