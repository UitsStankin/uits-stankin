import type { ChangeEventHandler } from 'react';
import { LoaderCircle } from 'lucide-react';

import { DEFAULT_AVATAR_URL } from '@shared/config/avatar';
import { cn } from '@shared/lib';

interface AvatarPickerProps {
  /** Что показывать в кружке; `null` — заглушку. */
  previewUrl: string | null;
  /** Файл уходит на сервер: кружок под спиннером, выбор заблокирован. */
  isUploading: boolean;
  /** Отказ загрузки. `null` — сообщения нет. */
  error: string | null;
  onSelect: (file: File) => void;
  /**
   * Убрать фото. Не передан — формой удаление не поддерживается вовсе
   * и кнопки нет. Передан — кнопка появляется, только когда есть что
   * убирать: «Удалить фото» под заглушкой ничего не значит.
   */
  onRemove?: () => void;
}

/**
 * Кружок с фото и выбор файла. Чистый: сам ничего не загружает
 * и не помнит — файл отдаёт наверх, состояние приходит пропсами.
 *
 * Заведён в форме карточки ППС (F-16), вынесен сюда вторым потребителем —
 * формой профиля (F-27). Обе показывают одно и то же и через одну ручку
 * (`POST /api/files`, раздел `avatars`), и разошедшиеся подписи «до 15 МБ»
 * в двух копиях — это две разные правды на одной странице кабинета.
 *
 * Предпросмотр — по адресу из ответа сервера, а не по локальному файлу:
 * сервер картинку перекодирует, стирает EXIF и ужимает длинную сторону
 * до 1600 px. Показывать исходник значило бы показывать не то,
 * что сохранится.
 */
export function AvatarPicker({
  previewUrl,
  isUploading,
  error,
  onSelect,
  onRemove,
}: AvatarPickerProps) {
  const handleFileChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    const file = event.target.files?.[0];
    if (file) onSelect(file);
    // Тот же файл, выбранный второй раз (после ошибки загрузки), должен
    // снова вызвать `change` — а без сброса значения браузер промолчит.
    event.target.value = '';
  };

  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0">
        <img
          src={previewUrl ?? DEFAULT_AVATAR_URL}
          alt=""
          aria-hidden
          className="h-28 w-28 rounded-full object-cover"
        />
        {isUploading && (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-white/70">
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
            Выбрать фото
            <input
              type="file"
              accept="image/jpeg,image/png"
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
              Удалить фото
            </button>
          )}
        </div>

        <p className="text-sm text-text-muted">JPEG или PNG, до 15 МБ.</p>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
