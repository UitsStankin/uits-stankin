import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { checkImageFile, pluralize } from '@shared/lib';
import type { FileCategory, FileUploadResponse } from '@shared/types';

import { uploadFile } from './files';
import { isApiError } from './problem';

/**
 * Загрузка картинки в `POST /api/files` — от выбора файла до ответа.
 *
 * Три потребителя делали одно и то же: форма профиля и форма карточки
 * ППС держали по копии проверок «JPEG или PNG, до 15 МБ» и разбора
 * отказа, а редактору (F-42) понадобилась третья. Общее здесь — всё,
 * что не зависит от формы: проверка до запроса, сам запрос, текст отказа.
 * Что делать с ответом — решает форма: аватар ложится в её состояние,
 * картинка редактора — в его строку вставки.
 *
 * `onUploaded` приходит колбэком, а не результатом в состоянии хука:
 * у форм результат уже живёт в своём состоянии с собственными правилами
 * («удалено» перекрывает «загружено»), и второй экземпляр той же правды
 * пришлось бы держать в согласии с первым.
 *
 * Файл, выбранный повторно до ответа на первый, сменяет его: колбэки
 * у `mutate` срабатывают только для последнего вызова, и первый файл
 * остаётся сиротой, которого уберёт фоновая задача бэкенда.
 */
export function useImageUpload(
  category: FileCategory,
  onUploaded: (uploaded: FileUploadResponse) => void,
) {
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({ mutationFn: (file: File) => uploadFile(file, category) });

  function select(file: File) {
    setError(null);

    const refusal = checkImageFile(file);

    if (refusal !== null) {
      setError(refusal);
      return;
    }

    mutation.mutate(file, {
      onSuccess: onUploaded,
      onError: (cause) => setError(describeUploadError(cause)),
    });
  }

  return {
    /** Проверить файл и, если он годится, отправить. */
    select,
    isUploading: mutation.isPending,
    /** Почему файл не загружен: отказ проверки или сервера. `null` — всё хорошо. */
    error,
    /** Убрать сообщение — когда форма решила иначе, например убрала фото. */
    clearError: () => setError(null),
  };
}

/**
 * Что показать под полем.
 *
 * `detail` бэкенда для этой ручки написан по-русски и годится для показа:
 * «Файл не является изображением», «Изображение больше 25 мегапикселей»,
 * а `ApiError` уже подменил его общим текстом там, где показывать нельзя
 * (сеть, 5xx). Своё только у `429`: контракт кладёт срок ожидания
 * в `Retry-After`, и «повторите позже» без срока хуже, чем со сроком.
 */
function describeUploadError(error: unknown): string {
  if (!isApiError(error)) return 'Не удалось загрузить изображение. Попробуйте ещё раз.';

  if (error.status === 429 && error.retryAfter !== null) {
    const seconds = error.retryAfter;

    return `Слишком много загрузок. Повторите через ${seconds} ${pluralize(seconds, ['секунду', 'секунды', 'секунд'])}.`;
  }

  return error.message;
}
