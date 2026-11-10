import { Archive, ArchiveRestore } from 'lucide-react';

interface ArchiveBarProps {
  archived: boolean;
  onArchive: () => void;
  onUnarchive: () => void;
  isPending: boolean;
}

/**
 * Состояние архива над формой карточки и действие, которое его меняет.
 *
 * Над формой, а не среди её кнопок: архив не сохраняется «Сохранить»,
 * у него своя ручка и он срабатывает сразу. Кнопка рядом с «Сохранить»
 * читалась бы как часть правки — и архив, нажатый с несохранёнными
 * полями, казался бы сохранившим их.
 *
 * У архивной карточки строка объясняет, почему её нет на сайте, — иначе
 * модератор, открывший её по ссылке, решил бы, что сохранение не дошло.
 * Правка архивной работает как обычно: `PUT` архив не снимает
 * (docs/API.md, «Архив»).
 */
export function ArchiveBar({ archived, onArchive, onUnarchive, isPending }: ArchiveBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded bg-white px-6 py-4 shadow-sm">
      <p className="text-base text-text-default">
        {archived
          ? 'Карточка в архиве: в списках на сайте её нет, по прямой ссылке она открывается.'
          : 'Карточка действующая. Ушедшего преподавателя отправьте в архив — связи сохранятся.'}
      </p>

      <button
        type="button"
        onClick={archived ? onUnarchive : onArchive}
        disabled={isPending}
        className="flex items-center gap-2 rounded border border-primary px-4 py-2 text-base font-bold text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
      >
        {archived ? (
          <ArchiveRestore aria-hidden="true" className="size-4" />
        ) : (
          <Archive aria-hidden="true" className="size-4" />
        )}
        {archived ? 'Вернуть из архива' : 'В архив'}
      </button>
    </div>
  );
}
