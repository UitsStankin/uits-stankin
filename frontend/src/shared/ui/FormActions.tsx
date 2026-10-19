import { LoaderCircle } from 'lucide-react';

import { cn } from '@shared/lib';

interface FormActionsProps {
  submitLabel?: string;
  isPending: boolean;
  onCancel: () => void;
}

/**
 * Кнопки формы админки: «Сохранить» и «Отмена». Полоса липнет к нижнему
 * краю окна, пока форма длиннее экрана: сохранить можно, не прокручивая
 * её до конца.
 */
export function FormActions({ submitLabel = 'Сохранить', isPending, onCancel }: FormActionsProps) {
  return (
    <div className="u-form-bar">
      <button
        type="submit"
        disabled={isPending}
        className={cn(
          'flex items-center justify-center gap-2 rounded bg-primary px-4 py-2.5',
          'text-base font-bold text-on-primary transition',
          'hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60',
        )}
      >
        {isPending && <LoaderCircle size={18} className="animate-spin" aria-hidden />}
        {isPending ? 'Сохраняем…' : submitLabel}
      </button>

      <button
        type="button"
        onClick={onCancel}
        disabled={isPending}
        className={cn(
          'rounded border border-field px-4 py-2.5 text-base font-bold text-text-heading',
          'transition hover:border-primary hover:text-primary',
          'disabled:cursor-not-allowed disabled:opacity-60',
        )}
      >
        Отмена
      </button>
    </div>
  );
}
