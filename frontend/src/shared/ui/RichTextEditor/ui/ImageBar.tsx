import type { KeyboardEvent } from 'react';
import { ImageOff, LoaderCircle } from 'lucide-react';

import { cn } from '@shared/lib';

import { barActionClass } from './barActionClass';

interface ImageBarProps {
  /** Идентификатор поля описания: к нему цепляется подпись. */
  id: string;
  /** Адрес загруженной картинки для миниатюры; `null` — ещё грузится или отказ. */
  previewUrl: string | null;
  isUploading: boolean;
  /** Отказ проверки или сервера; `null` — отказа нет. */
  error: string | null;
  alt: string;
  /** Картинка загружена — «Вставить» доступна. */
  canInsert: boolean;
  onAltChange: (alt: string) => void;
  onInsert: () => void;
  onCancel: () => void;
}

/**
 * Строка вставки картинки: миниатюра, описание, «Вставить» и «Отмена».
 * Чистая: всё приходит пропсами.
 *
 * Устроена как строка ссылки, и по тем же причинам: не `<form>` (поле
 * редактора стоит внутри формы записи) и не окно (человеку нужно видеть
 * текст, в который он вставляет). Enter здесь тоже перехвачен — иначе
 * он сохранил бы запись вместо того, чтобы вставить картинку.
 */
export function ImageBar({
  id,
  previewUrl,
  isUploading,
  error,
  alt,
  canInsert,
  onAltChange,
  onInsert,
  onCancel,
}: ImageBarProps) {
  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (canInsert) onInsert();
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
    }
  }

  return (
    <div className="flex flex-col gap-1.5 border-b border-default bg-light px-2 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <Thumbnail url={previewUrl} isUploading={isUploading} failed={error !== null} />

        <label htmlFor={id} className="text-sm font-bold text-text-heading">
          Описание
        </label>

        <input
          id={id}
          type="text"
          value={alt}
          onChange={(event) => onAltChange(event.target.value)}
          onKeyDown={onKeyDown}
          // Строка появляется, когда файл уже выбран: курсор сразу в описании,
          // иначе после диалога пришлось бы целиться в поле мышью.
          autoFocus
          placeholder="Что на картинке — для тех, кто её не увидит"
          className={cn(
            'min-w-0 flex-1 rounded border border-gray-300 bg-white px-2 py-1',
            'text-base text-text-default placeholder:text-text-muted',
            'focus:border-primary focus:ring-0',
          )}
        />

        <button type="button" onClick={onInsert} disabled={!canInsert} className={barActionClass}>
          Вставить
        </button>

        <button type="button" onClick={onCancel} className={barActionClass}>
          Отмена
        </button>
      </div>

      {isUploading && <p className="text-sm text-text-muted">Загружается…</p>}

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Что стало с файлом — одним взглядом: спиннер, миниатюра или перечёркнутая
 * картинка. Декоративно: то же самое написано рядом текстом.
 */
function Thumbnail({ url, isUploading, failed }: { url: string | null; isUploading: boolean; failed: boolean }) {
  const frame = 'flex h-12 w-16 shrink-0 items-center justify-center rounded border border-gray-300 bg-white';

  if (isUploading) {
    return (
      <span aria-hidden className={frame}>
        <LoaderCircle size={20} className="animate-spin text-primary" />
      </span>
    );
  }

  if (failed || url === null) {
    return (
      <span aria-hidden className={frame}>
        <ImageOff size={20} className="text-text-muted" />
      </span>
    );
  }

  return <img src={url} alt="" aria-hidden className="h-12 w-16 shrink-0 rounded object-cover" />;
}
