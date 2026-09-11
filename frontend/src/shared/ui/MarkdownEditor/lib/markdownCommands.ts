/**
 * Команды панели правки Markdown — чистые функции над текстом поля
 * и выделением в нём. Ни React, ни DOM: на входе текст и позиции, на выходе
 * новый текст и то, что после команды должно быть выделено.
 *
 * ### Почему команды правят исходник, а не показ
 *
 * `text` редактируемого раздела — исходник Markdown, и хранится он побайтово
 * таким, каким его набрал модератор (docs/API.md, «Редактируемые страницы»).
 * Панель поэтому не форматирует, а **дописывает разметку**: «Жирный» —
 * это две пары звёздочек вокруг выделения, «Список» — дефис в начале
 * строки. Всё, что панель умеет, человек мог бы набрать руками, и всё,
 * что он набрал руками, панель не трогает.
 *
 * ### Набор — как у старого редактора
 *
 * Панель `angular-markdown-editor` на старом портале: заголовок, жирный,
 * курсив, ссылка, картинка, два вида списка, цитата. Заголовков два уровня,
 * а не один, — как в rich-text редакторе рядом (F-41), и по той же причине
 * без первого: `h1` на странице занят названием раздела. Кода и таблицы
 * в панели нет: таблицу из кнопки не собрать осмысленно, а код на сайте
 * кафедры не публикуют; набранные руками, оба показываются как есть.
 *
 * ### Повторное нажатие снимает
 *
 * Как у переключателей форматирования: второй «Жирный» по тому же выделению
 * убирает звёздочки, второй «Список» — дефисы. Иначе промах мимо кнопки
 * исправлялся бы только правкой символов вручную.
 */

/** Текст поля и выделение в нём. Пустое выделение — курсор. */
export interface TextSelection {
  value: string;
  start: number;
  end: number;
}

export type MarkdownCommand =
  | 'heading2'
  | 'heading3'
  | 'bold'
  | 'italic'
  | 'link'
  | 'bulletList'
  | 'orderedList'
  | 'quote';

type InlineCommand = 'bold' | 'italic';
type LineCommand = 'heading2' | 'heading3' | 'bulletList' | 'orderedList' | 'quote';

/**
 * Разметка внутри строки. Курсив — подчёркиванием, а не звёздочкой: одиночная
 * звёздочка рядом с двойной жирного путала бы снятие — в `**текст**`
 * звёздочки по краям выделения есть, но это не курсив. Цена — курсив
 * посреди слова (`foo_bar_baz`) CommonMark не признаёт; на текстах кафедры
 * такого не бывает.
 *
 * Заглушка вставляется, когда выделения нет, и остаётся выделенной: следующая
 * набранная буква её заменит.
 */
const INLINE: Record<InlineCommand, { marker: string; placeholder: string }> = {
  bold: { marker: '**', placeholder: 'жирный текст' },
  italic: { marker: '_', placeholder: 'курсив' },
};

/**
 * Разметка начала строки: как узнать уже применённую и как её поставить.
 * У нумерованного списка номер зависит от места строки в выделении.
 */
const LINE: Record<LineCommand, { applied: RegExp; prefix: (index: number) => string }> = {
  heading2: { applied: /^## /, prefix: () => '## ' },
  heading3: { applied: /^### /, prefix: () => '### ' },
  bulletList: { applied: /^[-*+] /, prefix: () => '- ' },
  orderedList: { applied: /^\d+\. /, prefix: (index) => `${index + 1}. ` },
  quote: { applied: /^> ?/, prefix: () => '> ' },
};

/**
 * Любая разметка начала строки, которую команда заменяет своей: строка
 * бывает чем-то одним — заголовком, пунктом списка или цитатой, и «Список»
 * по заголовку делает из него пункт, а не пункт-заголовок.
 */
const ANY_LINE_MARKUP = /^(#{1,6} |[-*+] |\d+\. |> ?)/;

export function applyMarkdownCommand(
  command: MarkdownCommand,
  selection: TextSelection,
): TextSelection {
  switch (command) {
    case 'bold':
    case 'italic':
      return toggleInline(selection, INLINE[command]);
    case 'link':
      return insertLink(selection);
    default:
      return toggleLines(selection, LINE[command]);
  }
}

/**
 * Картинка по адресу из ответа загрузки (`POST /api/files`, раздел `pages`).
 *
 * Выделенный текст становится описанием; без выделения описание пустое,
 * и курсор встаёт в скобки — следующее, что человек набирает, это оно.
 * Заглушку «описание картинки» сюда не ставим намеренно: не заменённая,
 * она уехала бы в `alt` и читалась бы диктором вместо картинки. Пустой
 * `alt` честнее — картинка объявляется украшением (тот же выбор, что
 * у вставки картинки в rich-text, F-42).
 */
export function insertImage({ value, start, end }: TextSelection, url: string): TextSelection {
  const alt = value.slice(start, end).trim();
  const inserted = `![${alt}](${url})`;
  const caret = alt === '' ? start + 2 : start + inserted.length;

  return { value: value.slice(0, start) + inserted + value.slice(end), start: caret, end: caret };
}

function toggleInline(
  { value, start, end }: TextSelection,
  { marker, placeholder }: { marker: string; placeholder: string },
): TextSelection {
  // Пробелы по краям выделения остаются снаружи разметки: двойной щелчок
  // в части браузеров захватывает пробел после слова, а `**слово **`
  // CommonMark жирным не считает.
  const { from, to } = trimmed(value, start, end);
  const size = marker.length;

  const isWrapped =
    from >= size && value.slice(from - size, from) === marker && value.slice(to, to + size) === marker;

  if (isWrapped) {
    return {
      value: value.slice(0, from - size) + value.slice(from, to) + value.slice(to + size),
      start: from - size,
      end: to - size,
    };
  }

  const inner = from === to ? placeholder : value.slice(from, to);

  return {
    value: value.slice(0, from) + marker + inner + marker + value.slice(to),
    start: from + size,
    end: from + size + inner.length,
  };
}

/**
 * Ссылка вокруг выделения. Адреса у панели нет и спрашивать его негде,
 * поэтому ставится заготовка `https://`, и выделено то, что набирать
 * дальше: адрес, если текст у ссылки уже есть, иначе сам текст.
 */
function insertLink({ value, start, end }: TextSelection): TextSelection {
  const { from, to } = trimmed(value, start, end);
  const text = from === to ? 'текст ссылки' : value.slice(from, to);
  const url = 'https://';
  const next = value.slice(0, from) + `[${text}](${url})` + value.slice(to);

  if (from === to) return { value: next, start: from + 1, end: from + 1 + text.length };

  // `[` + текст + `](` — адрес начинается через три знака после текста.
  const urlStart = from + text.length + 3;

  return { value: next, start: urlStart, end: urlStart + url.length };
}

/**
 * Разметка начала строки для всех строк, которых касается выделение.
 *
 * Пустые строки внутри выделения не размечаются: дефис на пустой строке —
 * это пустой пункт, а номер — сбитая нумерация у следующих.
 */
function toggleLines(
  { value, start, end }: TextSelection,
  { applied, prefix }: { applied: RegExp; prefix: (index: number) => string },
): TextSelection {
  // Выделение, кончающееся ровно на переводе строки, — это выделенные
  // целиком строки, а не начало следующей: так выделяет мышь, протянутая
  // до левого края.
  const last = end > start && value[end - 1] === '\n' ? end - 1 : end;
  const blockStart = start === 0 ? 0 : value.lastIndexOf('\n', start - 1) + 1;
  const newline = value.indexOf('\n', last);
  const blockEnd = newline === -1 ? value.length : newline;

  const lines = value.slice(blockStart, blockEnd).split('\n');
  const filled = lines.filter((line) => line.trim() !== '');
  const isApplied = filled.length > 0 && filled.every((line) => applied.test(line));

  let index = 0;
  const block = lines
    .map((line) => {
      if (filled.length > 0 && line.trim() === '') return line;
      if (isApplied) return line.replace(applied, '');

      return prefix(index++) + line.replace(ANY_LINE_MARKUP, '');
    })
    .join('\n');

  const next = value.slice(0, blockStart) + block + value.slice(blockEnd);
  const delta = block.length - (blockEnd - blockStart);

  // Курсор в одной строке остаётся на своём месте в тексте — сдвигается
  // только на длину разметки. Выделенный кусок остаётся выделенным целиком.
  if (start === end && lines.length === 1) {
    const caret = Math.max(blockStart, start + delta);

    return { value: next, start: caret, end: caret };
  }

  return { value: next, start: blockStart, end: blockStart + block.length };
}

function trimmed(value: string, start: number, end: number): { from: number; to: number } {
  let from = start;
  let to = end;

  while (from < to && /\s/.test(value[from])) from++;
  while (to > from && /\s/.test(value[to - 1])) to--;

  return { from, to };
}
