import type { ReactNode } from 'react';
import { Link } from 'react-router';

/**
 * Кнопка и ссылка под текстом `StatusBlock` — «Повторить», «К первой
 * странице», «Ко всем преподавателям».
 *
 * Вынесены сюда, когда копий набралось шесть: по две в ленте новостей,
 * на детальной и в личном кабинете, — и к ним добавлялись ещё две
 * со списком ППС (F-21). Класс, размноженный по восьми местам, разъезжается
 * с первой же правкой темы, причём заметно это будет не везде сразу.
 *
 * Кнопка и ссылка — разные компоненты, а не один с `href?`: у первой
 * действие в этой же странице (`refetch`), у второй — переход, и подменять
 * одно другим нельзя ни в какую сторону.
 */
const actionClass =
  'rounded bg-primary px-4 py-2 text-base font-bold text-white transition-colors hover:bg-primary/90';

/** Повтор запроса после сбоя или обрыва связи. */
export function RetryButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={actionClass}>
      Повторить
    </button>
  );
}

/** Выход из тупика: ссылка туда, где содержимое точно есть. */
export function ActionLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className={actionClass}>
      {children}
    </Link>
  );
}
