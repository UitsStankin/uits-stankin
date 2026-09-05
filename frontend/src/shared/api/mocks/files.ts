import { http, HttpResponse } from 'msw';

import type { FileCategory } from '@shared/types';

const FILES = '*/api/files';

/**
 * Загрузка файла — `POST /api/files`.
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
 */
export function fileHandlers() {
  let uploads = 0;

  return [
    http.post(FILES, async ({ request }) => {
      const category = (multipartField(await request.text(), 'category') ??
        'news') as FileCategory;

      uploads += 1;
      const key = `${category}/uploaded-${String(uploads)}.jpg`;

      return HttpResponse.json({ key, url: `/media/${key}` }, { status: 201 });
    }),
  ];
}

/**
 * Значение простого текстового поля из тела `multipart/form-data`.
 *
 * Разбор руками вместо `await request.formData()`, и это не вкусовщина:
 * на Node 24 штатный разборщик роняет весь хендлер. Тело собирает jsdom,
 * а разбирает undici из Node, и её `multipartFormDataParser` требует,
 * чтобы часть была `File` **из его собственного realm**:
 *
 *   assert(typeof value === "string" && webidl.is.USVString(value)
 *          || webidl.is.File(value))
 *
 * Файл от jsdom эту проверку не проходит, `formData()` бросает
 * `ERR_ASSERTION`, MSW не находит хендлер вовсе — и запрос падает так,
 * будто сервер недоступен. На Node 22 разборщик мягче, и тест зеленел
 * локально, падая в CI: ровно тот случай, ради которого CI и стоит.
 *
 * `request.text()` ничего не разбирает — просто читает поток, — поэтому
 * работает на обеих версиях. Двоичное содержимое файла при таком чтении
 * может побиться, и это ничему не мешает: искомое поле — короткая
 * ASCII-строка, а сам файл моку не нужен.
 *
 * Границы частей ищутся по `name="..."`, значение начинается после пустой
 * строки и кончается перед следующим граничником. Годится для простых
 * текстовых полей, а других мок и не спрашивает.
 */
function multipartField(body: string, name: string): string | null {
  const at = body.indexOf(`name="${name}"`);
  if (at === -1) return null;

  const start = body.indexOf('\r\n\r\n', at);
  if (start === -1) return null;

  const end = body.indexOf('\r\n--', start + 4);
  return body.slice(start + 4, end === -1 ? undefined : end);
}
