import { LoaderCircle } from 'lucide-react';

import { cn } from '@shared/lib';

interface FormButtonsProps {
  submitLabel: string;
  pendingLabel: string;
  isPending: boolean;
  onCancel: () => void;
}

/** «Сохранить» и «Отмена» — общие у двух форм фичи, вид как у остальных форм админки. */
export function FormButtons({ submitLabel, pendingLabel, isPending, onCancel }: FormButtonsProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="submit"
        disabled={isPending}
        className={cn(
          'flex items-center justify-center gap-2 rounded bg-primary px-4 py-2.5',
          'text-base font-bold text-white transition',
          'hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60',
        )}
      >
        {isPending && <LoaderCircle size={18} className="animate-spin" aria-hidden />}
        {isPending ? pendingLabel : submitLabel}
      </button>

      <button
        type="button"
        onClick={onCancel}
        disabled={isPending}
        className={cn(
          'rounded border border-default px-4 py-2.5 text-base font-bold text-text-heading',
          'transition hover:border-primary hover:text-primary',
          'disabled:cursor-not-allowed disabled:opacity-60',
        )}
      >
        Отмена
      </button>
    </div>
  );
}

/** Баннер отказа, не привязанного к полю. */
export function FormError({ message }: { message: string | null }) {
  if (message === null) return null;

  return (
    <p role="alert" className="rounded bg-danger/10 px-3 py-2 text-base text-danger">
      {message}
    </p>
  );
}
