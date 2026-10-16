import { http, HttpResponse } from 'msw';

import type { FileCategory } from '@shared/types';

const FILES = '*/api/files';
const MEDIA = '*/media/*';

/**
 * Загрузка файла — `POST /api/files` — и раздача — `GET /media/{key}`.
 *
 * Ключ каждый раз новый и содержит раздел из запроса, а не берётся
 * константой. Это ровно те два свойства, на которые опираются формы:
 *
 * - **ключ приходит из ответа.** Форма обязана отправить в сущность тот,
 *   что вернула загрузка. С постоянным ответом тест прошёл бы и у формы,
 *   которая шлёт свой выдуманный ключ, — а живой бэкенд ответил бы `400`.
 * - **раздел выбирает форма.** Аватар, ушедший в раздел `news`, ключом
 *   для поля `avatar` не станет: контракт сверяет раздел ключа с полем.
 *
 * Настоящий формат ключа другой — год, месяц, UUID, — и это не важно:
 * контракт прямо называет формат деталью бэкенда, а фронт обязан
 * обращаться с ключом как с непрозрачной строкой. Имя файла в ключ
 * не попадает: в jsdom оно до сюда не доезжает, файл приезжает
 * безымянным `blob`.
 *
 * Раздача нужна браузеру: под `VITE_ENABLE_MOCKS` картинка, которую
 * только что загрузили в редакторе или в форме профиля, должна
 * показаться — иначе проверить вставку можно только по разметке.
 * Загруженный в этой сессии файл отдаётся как есть, чужой ключ
 * из фикстур — заглушкой с ключом вместо картинки. В тестах ветка
 * не работает: jsdom картинок не запрашивает.
 */
export function fileHandlers() {
  let uploads = 0;
  const stored = new Map<string, Blob>();

  return [
    http.post(FILES, async ({ request }) => {
      const { category, file } = await readUpload(request);

      uploads += 1;
      const key = `${category}/uploaded-${String(uploads)}.jpg`;

      if (file) stored.set(key, file);

      return HttpResponse.json({ key, url: `/media/${key}` }, { status: 201 });
    }),

    http.get(MEDIA, ({ request }) => {
      const key = new URL(request.url).pathname.replace(/^\/media\//, '');
      const file = stored.get(key);

      if (file) return new HttpResponse(file, { headers: { 'Content-Type': file.type } });

      return new HttpResponse(placeholderSvg(key), {
        headers: { 'Content-Type': 'image/svg+xml' },
      });
    }),
  ];
}

/**
 * Раздел и файл из тела `multipart/form-data`.
 *
 * Штатный `request.formData()` — только для браузера, в нём он и нужен:
 * файл потом отдаётся обратно по `GET /media`. В тестах он **не работает**,
 * и это не вкусовщина: на Node 24 штатный разборщик роняет весь хендлер.
 * Тело собирает jsdom, а разбирает undici из Node, и её
 * `multipartFormDataParser` требует, чтобы часть была `File` **из его
 * собственного realm**:
 *
 *   assert(typeof value === "string" && webidl.is.USVString(value)
 *          || webidl.is.File(value))
 *
 * Файл от jsdom эту проверку не проходит, `formData()` бросает
 * `ERR_ASSERTION`, и без запасного пути запрос падал бы так, будто
 * сервер недоступен. На Node 22 разборщик мягче, и тест зеленел
 * локально, падая в CI: ровно тот случай, ради которого CI и стоит.
 *
 * Запасной путь читает тело как текст: `request.text()` ничего
 * не разбирает, поэтому работает на обеих версиях. Двоичное содержимое
 * файла при таком чтении бьётся, и это ничему не мешает: тестам нужен
 * только раздел — короткая ASCII-строка, — а сам файл никто не запросит.
 */
async function readUpload(request: Request): Promise<{ category: FileCategory; file: Blob | null }> {
  const fallback = request.clone();

  try {
    const form = await request.formData();
    const file = form.get('file');

    return {
      category: (stringOrNull(form.get('category')) ?? 'news') as FileCategory,
      file: file instanceof Blob ? file : null,
    };
  } catch {
    return {
      category: (multipartField(await fallback.text(), 'category') ?? 'news') as FileCategory,
      file: null,
    };
  }
}

function stringOrNull(value: FormDataEntryValue | null): string | null {
  return typeof value === 'string' ? value : null;
}

/**
 * Значение простого текстового поля из тела `multipart/form-data`.
 *
 * Границы частей ищутся по `name="..."`, значение начинается после пустой
 * строки и кончается перед следующим граничником. Годится для простых
 * текстовых полей, а других запасной путь и не спрашивает.
 */
function multipartField(body: string, name: string): string | null {
  const at = body.indexOf(`name="${name}"`);
  if (at === -1) return null;

  const start = body.indexOf('\r\n\r\n', at);
  if (start === -1) return null;

  const end = body.indexOf('\r\n--', start + 4);
  return body.slice(start + 4, end === -1 ? undefined : end);
}

/** Серый прямоугольник с ключом вместо картинки, которой у мока нет. */
function placeholderSvg(key: string): string {
  const text = key.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">' +
    '<rect width="640" height="360" fill="#d6dbe1"/>' +
    `<text x="320" y="188" text-anchor="middle" font-family="sans-serif" font-size="22" fill="#3d4650">${text}</text>` +
    '</svg>'
  );
}
