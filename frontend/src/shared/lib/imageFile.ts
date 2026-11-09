/**
 * Что принимает `POST /api/files` в разделах картинок — проверка до запроса.
 *
 * Границы те же, что на сервере (docs/API.md, «Загрузка файлов»): JPEG
 * или PNG, до 15 МБ. Проверять их здесь — не недоверие к бэкенду,
 * а экономия: о файле не того формата лучше узнать до отправки
 * пятнадцати мегабайт. Сервер при этом строже — формат он определяет
 * по содержимому, а не по типу файла, и отдельно считает мегапиксели,
 * которых у `File` не спросить, — поэтому его отказ форма тоже показывает.
 *
 * Одно место на три формы и редактор: подпись «до 15 МБ» в двух копиях —
 * это две разные правды на одной странице, стоит одной из них измениться.
 */
const IMAGE_MIME_TYPES: readonly string[] = ['image/jpeg', 'image/png'];

const IMAGE_MAX_BYTES = 15 * 1024 * 1024;

/** Значение `accept` для `<input type="file">`: диалог сразу показывает нужное. */
export const IMAGE_ACCEPT = IMAGE_MIME_TYPES.join(',');

/** Подпись под выбором файла. */
export const IMAGE_HINT = 'JPEG или PNG, до 15 МБ.';

/**
 * Почему файл не годится — текстом для показа, или `null`, если годится.
 */
export function checkImageFile(file: File): string | null {
  if (!IMAGE_MIME_TYPES.includes(file.type)) return 'Подходят только JPEG и PNG.';
  if (file.size > IMAGE_MAX_BYTES) return 'Файл больше 15 МБ.';

  return null;
}

/**
 * Первая картинка среди файлов буфера обмена или перетаскивания;
 * `null` — картинок там нет, и событие не наше.
 *
 * Тип проверяется по началу `image/`, а не по белому списку выше: GIF
 * из буфера должен дойти до `checkImageFile` и получить объяснение,
 * а не молча ничего не сделать.
 */
export function imageFileOf(transfer: DataTransfer | null): File | null {
  const files = transfer?.files;
  if (!files) return null;

  for (const file of files) {
    if (file.type.startsWith('image/')) return file;
  }

  return null;
}
