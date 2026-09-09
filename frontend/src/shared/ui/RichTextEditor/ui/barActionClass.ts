import { cn } from '@shared/lib';

/**
 * Кнопки строк под панелью — «Применить», «Вставить», «Убрать», «Отмена».
 * У строки ссылки и строки картинки они одного вида, и класс один:
 * иначе две строки одного редактора разошлись бы на первой же правке
 * отступов.
 */
export const barActionClass = cn(
  'rounded border border-default bg-white px-2.5 py-1',
  'text-sm font-bold text-text-heading transition-colors',
  'hover:border-primary hover:text-primary',
  'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-default disabled:hover:text-text-heading',
);
