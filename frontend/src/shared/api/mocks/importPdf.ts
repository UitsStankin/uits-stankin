import { multipartField } from './files';
import { problemResponse } from './problemResponse';

/**
 * Проверка тела импорта расписания — общая у пар и экзаменов, как
 * и на бэкенде (docs/API.md, «Импорт расписания преподавателя»).
 *
 * Проверяется только одно — что часть `file` в теле есть. **Содержимое
 * файла мок не смотрит**, и это не упущение: в тестах его не видно.
 * Тело собирает jsdom, а undici из Node сериализует его `File` строкой
 * `undefined` с именем `blob` — проверено на этом стенде. Проверка
 * сигнатуры `%PDF` работала бы поэтому только в браузере, и мок вёл бы
 * себя в тестах иначе, чем под `VITE_ENABLE_MOCKS`, — то есть перестал бы
 * быть заменой бэкенда (D-F3).
 *
 * Тело читается текстом, а не `request.formData()`: штатный разборщик
 * undici на файле из jsdom роняет хендлер (разбор у `readUpload`
 * в `files.ts`).
 *
 * Отказы сервиса разбора (`400` на чужой или битый PDF), `409` и `503`
 * мок сам не отдаёт: они зависят от содержимого файла или от состояния
 * сервера и заводятся в тесте через `server.use`. Пустой и слишком
 * большой файл до сервера не доходят — их отсекает форма.
 *
 * `null` — тело годно; иначе — готовый ответ-отказ.
 */
export async function rejectImportBody(request: Request, instance: string) {
  if (multipartField(await request.text(), 'file') !== null) return null;

  return problemResponse(400, {
    title: 'Bad Request',
    detail: 'Файл не выбран',
    instance,
  });
}
