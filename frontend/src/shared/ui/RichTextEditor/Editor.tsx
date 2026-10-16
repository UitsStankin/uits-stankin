import { useRef } from 'react';
import { EditorContent } from '@tiptap/react';

import { IMAGE_ACCEPT, cn, errorId, labelId } from '@shared/lib';

import { TOOLBAR_BUTTONS } from './model/toolbarButtons';
import { useBarSlot } from './model/useBarSlot';
import { useFocusOnClose } from './model/useFocusOnClose';
import { useImageForm } from './model/useImageForm';
import { useLinkForm } from './model/useLinkForm';
import { useToolbarRoving } from './model/useToolbarRoving';
import {
  insertImage,
  runToolbarAction,
  useRichTextEditor,
  type ToolbarAction,
} from './model/useRichTextEditor';
import { EditorToolbar } from './ui/EditorToolbar';
import { ImageBar } from './ui/ImageBar';
import { LinkBar } from './ui/LinkBar';
import type { RichTextEditorProps } from './props';

/**
 * Сам редактор: панель, строки ссылки и картинки, область ввода.
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
  imageCategory,
}: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Место под панелью — одно на обе строки ввода, и заводится оно первым:
  // строка картинки нужна ещё до редактора, а строке ссылки нужен он.
  const bar = useBarSlot();

  // До экземпляра редактора: файл из буфера обмена приходит в обработчик
  // внутри него, и строке картинки нельзя зависеть от того, что она сама
  // помогает создать.
  const imageForm = useImageForm(imageCategory, fileInputRef, bar);

  const { editor, state } = useRichTextEditor({
    value,
    onChange,
    editable: !disabled,
    labelledBy: labelId(id),
    describedBy: error ? errorId(id) : undefined,
    invalid: error !== undefined,
    onImageFile: imageForm.enabled ? imageForm.receive : undefined,
  });

  const linkForm = useLinkForm(editor, bar);

  const buttons = imageForm.enabled
    ? TOOLBAR_BUTTONS
    : TOOLBAR_BUTTONS.filter((button) => button.action !== 'image');
  const roving = useToolbarRoving(buttons.length);

  // Место под панелью освободилось — курсор возвращается в текст. Смена
  // одной строки на другую его не трогает: строка ссылки, сменившаяся
  // строкой картинки, не должна уводить курсор из описания.
  useFocusOnClose(bar.open !== null, editor);

  function onAction(action: ToolbarAction) {
    if (!editor) return;

    if (action === 'link') {
      // Повторное нажатие закрывает строку — кнопка работает как
      // переключатель, и `aria-expanded` на ней это обещает.
      if (linkForm.isOpen) linkForm.close();
      else linkForm.open();

      return;
    }

    // Строку картинки открывает не кнопка, а выбранный файл: до него
    // показывать нечего. Соседнюю строку она сменит сама — место одно.
    if (action === 'image') {
      imageForm.pick();

      return;
    }

    runToolbarAction(editor, action);
  }

  function onImageInsert() {
    const image = imageForm.take();
    if (editor && image) insertImage(editor, image);
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
        buttons={buttons}
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

      {imageForm.isOpen && (
        <ImageBar
          id={`${id}-image-alt`}
          previewUrl={imageForm.previewUrl}
          isUploading={imageForm.isUploading}
          error={imageForm.error}
          alt={imageForm.alt}
          canInsert={imageForm.canInsert}
          onAltChange={imageForm.setAlt}
          onInsert={onImageInsert}
          onCancel={imageForm.close}
        />
      )}

      {/* Диалог выбора файла открывает кнопка панели, а сам input спрятан
          и из обхода, и от диктора: второй способ выбрать файл рядом
          с первым только путал бы. */}
      {imageForm.enabled && (
        <input
          ref={fileInputRef}
          type="file"
          accept={IMAGE_ACCEPT}
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
          onChange={imageForm.onFileChange}
        />
      )}

      <EditorContent editor={editor} />
    </div>
  );
}
