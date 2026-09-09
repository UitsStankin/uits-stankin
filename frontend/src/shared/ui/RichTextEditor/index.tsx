import { EditorContent } from '@tiptap/react';

import { cn, errorId, labelId } from '@shared/lib';
import { FieldShell } from '@shared/ui/FormFields';

import { TOOLBAR_BUTTONS } from './model/toolbarButtons';
import { useLinkForm } from './model/useLinkForm';
import { useToolbarRoving } from './model/useToolbarRoving';
import { runToolbarAction, useRichTextEditor, type ToolbarAction } from './model/useRichTextEditor';
import { EditorToolbar } from './ui/EditorToolbar';
import { LinkBar } from './ui/LinkBar';

interface RichTextEditorProps {
  /** Идентификатор поля: от него считаются `id` подписи и сообщения об ошибке. */
  id: string;
  label: string;
  /** Готовый HTML. Пустое поле — это `''`, а не `<p></p>`. */
  value: string;
  onChange: (html: string) => void;
  /** Текст ошибки под полем; `undefined` — ошибки нет. */
  error?: string;
  /** Идёт сохранение: править нельзя, панель погашена. */
  disabled?: boolean;
}

/**
 * Поле rich-text: панель форматирования и область ввода.
 *
 * Нужен там, где контракт объявляет поле rich-text: `content` новости,
 * конференции и достижения, `education` и `qualification` карточки ППС.
 * Для `text` редактируемых разделов он **не годится** — там в базе лежит
 * исходник Markdown, а не HTML (docs/API.md, «Редактируемые страницы»),
 * и WYSIWYG на его месте переписал бы разметку модератора в свою.
 *
 * ### Что здесь главное
 *
 * Схема редактора подогнана под белый список санитайзера бэкенда —
 * разбор в `model/extensions.ts`. Это не мелочь настройки: расхождение
 * в обе стороны теряет разметку молча, и узнаёт об этом посетитель,
 * а не модератор.
 *
 * ### Форма
 *
 * Значение отдаётся строкой HTML, поэтому в react-hook-form поле входит
 * через `Controller`, а не через `register`: `register` цепляется
 * к `onChange` DOM-элемента, а у `contenteditable` его нет.
 *
 * Каркас поля — общий (`FieldShell`), тот же, что у текстовых полей рядом:
 * подпись, отступы и разметка ошибки у соседних полей одной формы должны
 * совпадать, а совпадают они только тогда, когда рисуются одним кодом.
 * Подпись при этом не `<label>`: `for` цепляется к полям ввода,
 * а не к `contenteditable`, и связь идёт через `aria-labelledby`.
 */
export function RichTextEditor({
  id,
  label,
  value,
  onChange,
  error,
  disabled = false,
}: RichTextEditorProps) {
  const { editor, state } = useRichTextEditor({
    value,
    onChange,
    editable: !disabled,
    labelledBy: labelId(id),
    describedBy: error ? errorId(id) : undefined,
    invalid: error !== undefined,
  });

  const linkForm = useLinkForm(editor);
  const roving = useToolbarRoving(TOOLBAR_BUTTONS.length);

  function onAction(action: ToolbarAction) {
    if (!editor) return;

    if (action === 'link') {
      // Повторное нажатие закрывает строку — кнопка работает как
      // переключатель, и `aria-expanded` на ней это обещает.
      if (linkForm.isOpen) linkForm.close();
      else linkForm.open();

      return;
    }

    runToolbarAction(editor, action);
  }

  return (
    <FieldShell id={id} label={label} error={error} labelAsText>
      <div
        className={cn(
          'overflow-hidden rounded border bg-white transition-colors',
          // Рамка ведёт себя как у обычного поля: подсвечивается, когда
          // курсор внутри, краснеет при ошибке. Фокус живёт на области
          // ввода, поэтому `focus-within`, а не `focus`.
          error === undefined ? 'border-gray-300 focus-within:border-primary' : 'border-danger',
        )}
      >
        <EditorToolbar
          fieldLabel={label}
          state={state}
          isLinkFormOpen={linkForm.isOpen}
          disabled={disabled}
          onAction={onAction}
          activeIndex={roving.activeIndex}
          onKeyDown={roving.onKeyDown}
          onFocus={roving.onFocus}
        />

        {linkForm.isOpen && (
          <LinkBar
            id={`${id}-href`}
            href={linkForm.href}
            error={linkForm.error}
            canRemove={linkForm.canRemove}
            onHrefChange={linkForm.setHref}
            onApply={linkForm.apply}
            onRemove={linkForm.remove}
            onCancel={linkForm.close}
          />
        )}

        <EditorContent editor={editor} />
      </div>
    </FieldShell>
  );
}
