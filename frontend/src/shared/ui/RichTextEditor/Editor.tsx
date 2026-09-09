import { EditorContent } from '@tiptap/react';

import { cn, errorId, labelId } from '@shared/lib';

import { TOOLBAR_BUTTONS } from './model/toolbarButtons';
import { useLinkForm } from './model/useLinkForm';
import { useToolbarRoving } from './model/useToolbarRoving';
import { runToolbarAction, useRichTextEditor, type ToolbarAction } from './model/useRichTextEditor';
import { EditorToolbar } from './ui/EditorToolbar';
import { LinkBar } from './ui/LinkBar';
import type { RichTextEditorProps } from './props';

/**
 * Сам редактор: панель, строка ссылки и область ввода.
 *
 * Отдельным модулем с экспортом по умолчанию, потому что грузится он
 * лениво — `index.tsx` подставляет его через `lazy()`. Разбор, почему
 * так, — там же.
 */
export default function Editor({
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
  );
}
