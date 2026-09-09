import { useEffect } from 'react';
import { useEditor, useEditorState, type Editor } from '@tiptap/react';

import { cn } from '@shared/lib';
import { richTextClass } from '@shared/ui/richTextClass';

import { isEmptyHtml } from '../lib/html';
import { richTextExtensions } from './extensions';

/** Кнопки панели — они же команды редактора. */
export type ToolbarAction =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strike'
  | 'heading2'
  | 'heading3'
  | 'bulletList'
  | 'orderedList'
  | 'blockquote'
  | 'subscript'
  | 'superscript'
  | 'link'
  | 'clear';

/** Что из перечисленного включено там, где стоит курсор. */
export type ToolbarState = Partial<Record<ToolbarAction, boolean>>;

interface RichTextEditorParams {
  /** Текущее значение поля формы — готовый HTML. */
  value: string;
  /** Новое значение после каждой правки; пустой документ отдаётся как `''`. */
  onChange: (html: string) => void;
  /** Правка запрещена, пока идёт сохранение. */
  editable: boolean;
  /** Идентификатор подписи поля: `<label for>` к contenteditable не цепляется. */
  labelledBy: string;
  /** Идентификатор сообщения об ошибке — или `undefined`, если ошибки нет. */
  describedBy: string | undefined;
  /** Поле не прошло проверку: диктор говорит об этом до чтения текста. */
  invalid: boolean;
}

/**
 * Экземпляр редактора и всё, что о нём знает форма.
 *
 * ### Значение внутрь и наружу
 *
 * TipTap хранит документ у себя, поэтому «управляемым» полем в смысле
 * React он не бывает: `value` уходит внутрь один раз при создании,
 * дальше правки приходят наружу событием. Насильно перекладывать
 * `value` в документ на каждый рендер нельзя — курсор прыгал бы в начало
 * на каждой букве.
 *
 * Обратная синхронизация всё же нужна — форму сбрасывают снаружи
 * (`reset` после сохранения, переход к другой записи), — и делается она
 * с двумя оговорками: только когда поле **не** в фокусе, и только когда
 * значение действительно разошлось с документом.
 *
 * ### Пустота
 *
 * Наружу пустой документ отдаётся пустой строкой, а не `<p></p>`, —
 * разбор в `lib/html.ts`. Сравнение при синхронизации идёт по тому же
 * правилу: иначе `''` в форме и `<p></p>` в документе считались бы
 * расхождением, и поле переставлялось бы само на каждом рендере.
 */
export function useRichTextEditor({
  value,
  onChange,
  editable,
  labelledBy,
  describedBy,
  invalid,
}: RichTextEditorParams) {
  const editor = useEditor({
    extensions: richTextExtensions,
    content: value,
    editable,
    editorProps: {
      attributes: {
        // Типографика — общая с показом на странице: модератор правит
        // ровно то, что увидит посетитель.
        class: cn(
          richTextClass,
          'min-h-40 px-3 py-2 focus:outline-none',
          // Плейсхолдер prose'а: пустой абзац схлопывается в ноль высоты,
          // и по пустому полю нечем попасть курсором.
          'prose-p:my-2 prose-headings:mt-4 prose-headings:mb-2',
        ),
        // contenteditable диктор читает как «правка», но без роли не
        // объявляет его полем ввода и не переключается в режим форм.
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-labelledby': labelledBy,
        'aria-invalid': String(invalid),
        ...(describedBy ? { 'aria-describedby': describedBy } : {}),
      },
    },
    onUpdate: ({ editor }) => onChange(editorHtml(editor)),
    // Тесты и браузер одинаково рисуют редактор на первом рендере;
    // серверного рендера у портала нет.
    immediatelyRender: true,
  });

  /*
   * `editable` через `setEditable`, а не через опции: обвязка React
   * пересобирает опции на каждом рендере, но `editable` из них
   * намеренно игнорирует — сохраняет то, что стоит у экземпляра
   * (`EditorInstanceManager.onRender`). Переданный опцией, он подействовал
   * бы ровно один раз, при создании.
   */
  useEffect(() => {
    editor?.setEditable(editable);
  }, [editor, editable]);

  useEffect(() => {
    if (!editor || editor.isFocused) return;
    if (editorHtml(editor) === value) return;

    // `emitUpdate: false` — иначе подстановка внешнего значения вернулась
    // бы в форму как правка пользователя и пометила бы её изменённой.
    editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);

  const state = useEditorState({
    editor,
    selector: ({ editor }): ToolbarState => (editor ? activeMarks(editor) : {}),
  });

  return { editor, state: state ?? {} };
}

/** HTML документа для формы: пустой — это пустая строка, а не `<p></p>`. */
function editorHtml(editor: Editor): string {
  const html = editor.getHTML();

  return isEmptyHtml(html) ? '' : html;
}

/**
 * Состояние кнопок панели.
 *
 * Считается на каждой транзакции — то есть и при перемещении курсора,
 * а не только при правке: подсветка «жирный» должна включаться, когда
 * курсор въезжает в жирный текст.
 */
function activeMarks(editor: Editor): ToolbarState {
  return {
    bold: editor.isActive('bold'),
    italic: editor.isActive('italic'),
    underline: editor.isActive('underline'),
    strike: editor.isActive('strike'),
    heading2: editor.isActive('heading', { level: 2 }),
    heading3: editor.isActive('heading', { level: 3 }),
    bulletList: editor.isActive('bulletList'),
    orderedList: editor.isActive('orderedList'),
    blockquote: editor.isActive('blockquote'),
    subscript: editor.isActive('subscript'),
    superscript: editor.isActive('superscript'),
    link: editor.isActive('link'),
  };
}

/**
 * Команда кнопки. `focus()` в начале цепочки обязателен: панель забирает
 * фокус на себя, и без возврата команда применилась бы к позиции, которой
 * на экране не видно.
 *
 * «Ссылка» сюда не попадает — ей нужен адрес, и она живёт в своей строке
 * ввода (`useLinkForm`).
 */
export function runToolbarAction(editor: Editor, action: Exclude<ToolbarAction, 'link'>) {
  const chain = editor.chain().focus();

  switch (action) {
    case 'bold':
      return chain.toggleBold().run();
    case 'italic':
      return chain.toggleItalic().run();
    case 'underline':
      return chain.toggleUnderline().run();
    case 'strike':
      return chain.toggleStrike().run();
    case 'heading2':
      return chain.toggleHeading({ level: 2 }).run();
    case 'heading3':
      return chain.toggleHeading({ level: 3 }).run();
    case 'bulletList':
      return chain.toggleBulletList().run();
    case 'orderedList':
      return chain.toggleOrderedList().run();
    case 'blockquote':
      return chain.toggleBlockquote().run();
    case 'subscript':
      return chain.toggleSubscript().run();
    case 'superscript':
      return chain.toggleSuperscript().run();
    // Снятие форматирования — это два разных действия: убрать выделение
    // (жирный, ссылка) и вернуть абзацу вид абзаца (из заголовка,
    // из списка). Одной командой обходится только первое, и вставленный
    // из Word заголовок остался бы заголовком.
    case 'clear':
      return chain.unsetAllMarks().clearNodes().run();
  }
}
