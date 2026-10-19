import { useEffect, useMemo, useRef, type ChangeEvent } from 'react';
import { EditorContent, useEditorState, type Editor as TipTapEditor, type EditorEvents } from '@tiptap/react';
import { LoaderCircle, X } from 'lucide-react';

import { IMAGE_ACCEPT, cn, errorId, labelId } from '@shared/lib';

import { documentExtensions } from './model/extensions';
import { TOOLBAR_BUTTONS } from './model/toolbarButtons';
import { useBarSlot } from './model/useBarSlot';
import { useFocusOnClose } from './model/useFocusOnClose';
import { useGalleryInsert } from './model/useGalleryInsert';
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

const PHOTO_BUTTON_LABEL = 'Фото или карусель (можно выбрать несколько)';

const COMPACT_ACTIONS: readonly ToolbarAction[] = ['bold', 'italic', 'bulletList', 'orderedList', 'link'];

function countWords(text: string): number {
  const words = text.trim().split(/\s+/);

  return words[0] === '' ? 0 : words.length;
}

/**
 * Сам редактор: панель, строки ссылки и картинки, область ввода.
 *
 * Отдельным модулем с экспортом по умолчанию, потому что грузится он
 * лениво — `index.tsx` подставляет его через `lazy()`. Разбор, почему
 * так, — там же.
 *
 * Поле-документ (`variant="document"`) вставляет фото иначе, чем обычное
 * поле: без строки описания, сразу блоком — одно фото с подписью или
 * карусель из нескольких, если файлов было несколько.
 */
export default function Editor({
  id,
  label,
  value,
  onChange,
  error,
  disabled = false,
  imageCategory,
  variant = 'field',
  placeholder,
}: RichTextEditorProps) {
  const isDocument = variant === 'document';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<TipTapEditor | null>(null);
  // Место под панелью — одно на обе строки ввода, и заводится оно первым:
  // строка картинки нужна ещё до редактора, а строке ссылки нужен он.
  const bar = useBarSlot();

  // До экземпляра редактора: файл из буфера обмена приходит в обработчик
  // внутри него, и строке картинки нельзя зависеть от того, что она сама
  // помогает создать.
  const imageForm = useImageForm(imageCategory, fileInputRef, bar);

  // Куда уронили файл. Пока он грузится и человек набирает описание,
  // текст выше может меняться, поэтому позиция едет вместе с документом.
  const dropPos = useRef<number | null>(null);

  const gallery = useGalleryInsert(imageCategory, editorRef, dropPos);

  const extensions = useMemo(
    () =>
      isDocument
        ? documentExtensions({
            category: imageCategory,
            onPickPhotos: imageCategory ? () => document.getElementById(`${id}-photos`)?.click() : null,
          })
        : undefined,
    [isDocument, imageCategory, id],
  );

  function onImageFiles(files: File[], pos?: number) {
    if (isDocument) {
      void gallery.insertFiles(files, pos);
      return;
    }

    const [first] = files;
    if (!first) return;

    dropPos.current = pos ?? null;
    imageForm.receive(first);
  }

  const { editor, state } = useRichTextEditor({
    value,
    onChange,
    editable: !disabled,
    labelledBy: labelId(id),
    describedBy: error ? errorId(id) : undefined,
    invalid: error !== undefined,
    extensions,
    onImageFiles: imageForm.enabled ? onImageFiles : undefined,
    variant,
    placeholder,
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  useEffect(() => {
    if (!editor) return;

    const follow = ({ transaction }: EditorEvents['transaction']) => {
      if (dropPos.current !== null && transaction.docChanged) {
        dropPos.current = transaction.mapping.map(dropPos.current);
      }
    };

    editor.on('transaction', follow);

    return () => {
      editor.off('transaction', follow);
    };
  }, [editor]);

  const words = useEditorState({
    editor,
    selector: ({ editor: current }) => (current ? countWords(current.getText()) : 0),
  });

  const linkForm = useLinkForm(editor, bar);

  const buttons = (
    variant === 'compact'
      ? TOOLBAR_BUTTONS.filter((button) => COMPACT_ACTIONS.includes(button.action))
      : imageForm.enabled
        ? TOOLBAR_BUTTONS
        : TOOLBAR_BUTTONS.filter((button) => button.action !== 'image')
  ).map((button) =>
    button.action === 'image' && isDocument ? { ...button, label: PHOTO_BUTTON_LABEL } : button,
  );
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
    const pos = dropPos.current ?? undefined;
    dropPos.current = null;

    if (editor && image) insertImage(editor, image, pos);
  }

  function onImageCancel() {
    dropPos.current = null;
    imageForm.close();
  }

  function onPhotosChosen(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';

    void gallery.insertFiles(files);
  }

  return (
    <div
      className={
        isDocument
          ? cn('u-doc-editor', error !== undefined && 'u-doc-editor--invalid')
          : cn(
              'overflow-hidden rounded border bg-surface transition-colors',
              // Рамка ведёт себя как у обычного поля: подсвечивается, когда
              // курсор внутри, краснеет при ошибке. Фокус живёт на области
              // ввода, поэтому `focus-within`, а не `focus`.
              error === undefined ? 'border-field focus-within:border-primary' : 'border-danger',
            )
      }
    >
      <div className={isDocument ? 'u-doc-sticky' : undefined}>
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
            onCancel={onImageCancel}
          />
        )}

        {isDocument && gallery.progress && (
          <p className="u-doc-status" role="status">
            <LoaderCircle aria-hidden="true" size={16} className="animate-spin" />
            Загружаю фото: {Math.min(gallery.progress.done + 1, gallery.progress.total)} из{' '}
            {gallery.progress.total}…
          </p>
        )}

        {isDocument && gallery.error && !gallery.progress && (
          <p className="u-doc-status u-doc-status--error" role="alert">
            {gallery.error}
            <button type="button" aria-label="Закрыть сообщение" onClick={gallery.clearError}>
              <X aria-hidden="true" size={14} />
            </button>
          </p>
        )}
      </div>

      {/* Диалог выбора файла открывает кнопка панели, а сам input спрятан
          и из обхода, и от диктора: второй способ выбрать файл рядом
          с первым только путал бы. */}
      {imageForm.enabled && (
        <input
          ref={fileInputRef}
          id={`${id}-photos`}
          type="file"
          accept={IMAGE_ACCEPT}
          multiple={isDocument}
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
          onChange={isDocument ? onPhotosChosen : imageForm.onFileChange}
        />
      )}

      <EditorContent editor={editor} />

      {isDocument && (
        <p className="u-doc-hint">
          <span>
            Наберите «/» в пустой строке, чтобы вставить блок. Работает Markdown: # заголовок, -
            список, **жирный**, &gt; цитата.
            {imageForm.enabled &&
              ' Фото можно перетащить в текст — несколько сразу станут каруселью.'}
          </span>
          <span className="u-doc-count">{words} сл.</span>
        </p>
      )}
    </div>
  );
}
