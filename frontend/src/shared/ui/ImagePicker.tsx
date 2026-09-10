import type { ChangeEventHandler } from 'react';
import { ImageIcon, LoaderCircle } from 'lucide-react';

import { DEFAULT_AVATAR_URL } from '@shared/config/avatar';
import { IMAGE_ACCEPT, IMAGE_HINT, cn } from '@shared/lib';

interface ImagePickerProps {
  /**
   * Что за картинка. От этого зависят форма предпросмотра, заглушка
   * и подписи кнопок: аватар — кружок с силуэтом, обложка — широкая
   * рамка, которая без картинки так и остаётся пустой рамкой.
   */
  variant: 'avatar' | 'cover';
  /** Что показывать в предпросмотре; `null` — заглушку. */
  previewUrl: string | null;
  /** Файл уходит на сервер: предпросмотр под спиннером, выбор заблокирован. */
  isUploading: boolean;
  /** Отказ загрузки. `null` — сообщения нет. */
  error: string | null;
  onSelect: (file: File) => void;
  /**
   * Убрать картинку. Не передан — формой удаление не поддерживается вовсе
   * и кнопки нет. Передан — кнопка появляется, только когда есть что
   * убирать: «Удалить фото» под заглушкой ничего не значит.
   */
  onRemove?: () => void;
}

const LABELS = {
  avatar: { select: 'Выбрать фото', remove: 'Удалить фото' },
  cover: { select: 'Выбрать обложку', remove: 'Убрать обложку' },
} as const;

/**
 * Предпросмотр картинки и выбор файла. Чистый: сам ничего не загружает
 * и не помнит — файл отдаёт наверх, состояние приходит пропсами
 * (обычно из `useImageUpload`).
 *
 * Заведён в форме карточки ППС (F-16) кружком аватара, вынесен сюда
 * вторым потребителем — формой профиля (F-27), — а с F-42 умеет и обложку:
 * `previewImage` новости, конференции и достижения ходит в ту же ручку
 * (`POST /api/files`) с теми же границами, и отдельный компонент под неё
 * означал бы вторую копию подписи «до 15 МБ», которая разъедется
 * с первой при следующей правке лимита.
 *
 * Предпросмотр — по адресу из ответа сервера, а не по локальному файлу:
 * сервер картинку перекодирует, стирает EXIF и ужимает длинную сторону
 * до 1600 px. Показывать исходник значило бы показывать не то,
 * что сохранится.
 */
export function ImagePicker({
  variant,
  previewUrl,
  isUploading,
  error,
  onSelect,
  onRemove,
}: ImagePickerProps) {
  const labels = LABELS[variant];

  const handleFileChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    const file = event.target.files?.[0];
    if (file) onSelect(file);
    // Тот же файл, выбранный второй раз (после ошибки загрузки), должен
    // снова вызвать `change` — а без сброса значения браузер промолчит.
    event.target.value = '';
  };

  return (
    <div className="flex flex-wrap items-center gap-5">
      <div className="relative shrink-0">
        <Preview variant={variant} url={previewUrl} />
        {isUploading && (
          <span
            className={cn(
              'absolute inset-0 flex items-center justify-center bg-white/70',
              variant === 'avatar' ? 'rounded-full' : 'rounded',
            )}
          >
            <LoaderCircle size={24} className="animate-spin text-primary" aria-hidden />
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap gap-2">
          {/* Кнопка-подпись поверх скрытого input: родной «Выберите файл»
              не стилизуется, а подпись отдаёт ему клик и фокус бесплатно. */}
          <label
            className={cn(
              'cursor-pointer self-start rounded border border-default px-3 py-1.5',
              'text-sm font-bold text-text-heading transition hover:border-primary hover:text-primary',
            )}
          >
            {labels.select}
            <input
              type="file"
              accept={IMAGE_ACCEPT}
              className="sr-only"
              disabled={isUploading}
              onChange={handleFileChange}
            />
          </label>

          {onRemove && previewUrl !== null && (
            <button
              type="button"
              onClick={onRemove}
              disabled={isUploading}
              className={cn(
                'self-start rounded border border-default px-3 py-1.5 text-sm font-bold',
                'text-text-muted transition hover:border-danger hover:text-danger',
                'disabled:cursor-not-allowed disabled:opacity-60',
              )}
            >
              {labels.remove}
            </button>
          )}
        </div>

        <p className="text-sm text-text-muted">{IMAGE_HINT}</p>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Сама картинка или её заглушка. Декоративна в обоих вариантах: всё,
 * что она могла бы сообщить, стоит рядом текстом или в отдельном поле
 * описания, — диктору её читать незачем.
 *
 * У аватара заглушка — общий силуэт портала, тот же, что в шапке
 * и на карточках. У обложки заглушки-картинки нет: новость без обложки —
 * обычное дело, и рамка с иконкой говорит «пусто» честнее, чем чужая
 * картинка на месте своей.
 */
function Preview({ variant, url }: { variant: 'avatar' | 'cover'; url: string | null }) {
  if (variant === 'avatar') {
    return (
      <img
        src={url ?? DEFAULT_AVATAR_URL}
        alt=""
        aria-hidden
        className="h-28 w-28 rounded-full object-cover"
      />
    );
  }

  if (url === null) {
    return (
      <div
        aria-hidden
        className="flex aspect-video w-56 items-center justify-center rounded border border-dashed border-gray-300 bg-light"
      >
        <ImageIcon size={32} className="text-text-muted" />
      </div>
    );
  }

  return <img src={url} alt="" aria-hidden className="aspect-video w-56 rounded object-cover" />;
}
