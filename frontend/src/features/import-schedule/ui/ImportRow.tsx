import type { ChangeEvent } from 'react';
import { FileUp, LoaderCircle } from 'lucide-react';

import { cn } from '@shared/lib';

import type { ImportOutcome } from '../model/useScheduleImport';

interface ImportRowProps {
  /** «Расписание пар» — и заголовок строки, и подпись выбора файла. */
  title: string;
  /** Что лежит сейчас, уже словами: «Сейчас загружено: 24 занятия». */
  currentText: string;
  outcome: ImportOutcome | null;
  /** Этот документ сейчас разбирается. */
  isPending: boolean;
  /** Выбор заперт — разбирается этот или соседний документ. */
  isDisabled: boolean;
  onSelect: (file: File) => void;
}

/**
 * Строка одного документа: что загружено сейчас, выбор PDF и итог
 * последней попытки.
 *
 * Выбор — подпись поверх скрытого `input[type=file]`, как у `ImagePicker`:
 * родное «Выберите файл» не стилизуется, а подпись отдаёт ему клик
 * и фокус. Кольцо фокуса рисуется на подписи через `focus-within`:
 * сам `input` невидим, и без этого с клавиатуры не видно, где фокус.
 *
 * Значение `input` сбрасывается сразу после выбора: иначе повторный выбор
 * того же файла — а это обычный ход после `503` — не породил бы `change`
 * вовсе, и кнопка «не работала» бы.
 */
export function ImportRow({
  title,
  currentText,
  outcome,
  isPending,
  isDisabled,
  onSelect,
}: ImportRowProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) onSelect(file);
  };

  return (
    <div className="flex flex-col gap-2 border-t border-default py-4 first:border-t-0 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col">
          <h3 className="text-base font-bold text-text-heading">{title}</h3>
          <p className="text-sm text-text-muted">{currentText}</p>
        </div>

        <label
          className={cn(
            'flex cursor-pointer items-center gap-2 rounded border border-primary px-4 py-2',
            'text-base font-bold text-primary transition-colors hover:bg-primary/10',
            'focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary',
            isDisabled && 'pointer-events-none opacity-50',
          )}
        >
          {isPending ? (
            <LoaderCircle aria-hidden className="size-4 animate-spin" />
          ) : (
            <FileUp aria-hidden className="size-4" />
          )}
          {isPending ? 'Разбираем PDF…' : 'Загрузить PDF'}
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            aria-label={`${title}: загрузить PDF`}
            disabled={isDisabled}
            onChange={handleChange}
          />
        </label>
      </div>

      {outcome && (
        <p
          role={outcome.tone === 'error' ? 'alert' : 'status'}
          className={cn('text-sm', outcome.tone === 'error' ? 'text-danger' : 'text-success')}
        >
          {outcome.text}
        </p>
      )}
    </div>
  );
}
