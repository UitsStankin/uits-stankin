import { CheckCircle2, X, XCircle } from 'lucide-react';

import { cn } from '@shared/lib';
import type { ToastTone } from '@shared/store';

interface ToastCardProps {
  tone: ToastTone;
  text: string;
  onClose: () => void;
}

/** Плашка одного сообщения. Чистая: и текст, и закрытие приходят пропсами. */
export function ToastCard({ tone, text, onClose }: ToastCardProps) {
  const Icon = tone === 'success' ? CheckCircle2 : XCircle;

  return (
    <div
      className={cn(
        'pointer-events-auto flex w-full items-start gap-3 rounded px-4 py-3 shadow-lg',
        'bg-white text-base text-text-default',
        // Полоса слева, а не заливка всей плашки: длинный текст отказа
        // на цветном фоне читается хуже, а отличить успех от ошибки
        // достаточно и по ней с иконкой.
        tone === 'success' ? 'border-l-4 border-success' : 'border-l-4 border-danger',
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn('mt-0.5 size-5 shrink-0', tone === 'success' ? 'text-success' : 'text-danger')}
      />

      <p className="flex-1">{text}</p>

      {/*
        Крестик обязателен: сообщение об отказе висит десять секунд,
        и загораживать таблицу всё это время оно не должно, если прочитано.
      */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Закрыть сообщение"
        className="-mr-1 -mt-1 rounded p-1 text-text-muted transition-colors hover:text-text-heading"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}
