import { useRef } from 'react';

import { IMAGE_ACCEPT, cn, errorId } from '@shared/lib';
import type { FileCategory } from '@shared/types';
import { FieldShell } from '@shared/ui/FormFields';
import Markdown from '@shared/ui/Markdown';

import { panelId, tabId } from './lib/tabIds';
import { useEditorTabs } from './model/useEditorTabs';
import { useMarkdownEditor } from './model/useMarkdownEditor';
import { EditorTabs } from './ui/EditorTabs';
import { MarkdownToolbar } from './ui/MarkdownToolbar';

export interface MarkdownEditorProps {
  /** Идентификатор поля: он же `id` области ввода, от него считаются остальные. */
  id: string;
  label: string;
  /** Исходник Markdown. Пустое поле — `''`. */
  value: string;
  onChange: (text: string) => void;
  /** Текст ошибки под полем; `undefined` — ошибки нет. */
  error?: string;
  /** Идёт сохранение: править нельзя. */
  disabled?: boolean;
  /**
   * Раздел хранилища для картинок (`POST /api/files`, `category`). Задан —
   * в панели есть «Картинка»; не задан — нет. Раздел называет форма,
   * а не поле: от раздела зависят права на загрузку (разбор у rich-text
   * редактора, `shared/ui/RichTextEditor/props.ts`).
   */
  imageCategory?: FileCategory;
}

/**
 * Поле правки исходника Markdown с предпросмотром — для `text`
 * редактируемых разделов.
 *
 * ### Почему не WYSIWYG
 *
 * В базе лежит исходник, и храниться он обязан таким, каким его набрал
 * модератор (docs/API.md, «Редактируемые страницы»). Rich-text редактор
 * на этом месте переписал бы разметку в свою при первом же открытии
 * формы: таблицы и чекбоксы GFM, которых в схеме TipTap нет, пропали бы
 * молча. Здесь исходник правится как текст, а панель только дописывает
 * разметку (`lib/markdownCommands.ts`) — то, чем на старом портале был
 * `angular-markdown-editor`.
 *
 * ### Предпросмотр — тем же, чем покажет сайт
 *
 * Вкладка «Предпросмотр» рисует текст общим `shared/ui/Markdown` — тем же
 * компонентом, что публичная страница раздела, с теми же ограничениями:
 * без `rehype-raw`, сырой HTML не исполняется, таблица прокручивается
 * внутри себя. Модератор обязан видеть то, что увидит посетитель, а не
 * что-то похожее — ровно поэтому своего рендера у поля нет.
 *
 * Вкладками, а не двумя колонками рядом: в колонке админки на 1280 px
 * половина ширины уже строки публичной страницы, и предпросмотр переносил
 * бы таблицу учебного плана не там, где её перенесёт сайт.
 *
 * Не ленивое, в отличие от rich-text редактора: это `<textarea>` и уже
 * загруженный рендер Markdown, отделять нечего.
 */
export function MarkdownEditor({
  id,
  label,
  value,
  onChange,
  error,
  disabled = false,
  imageCategory,
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useMarkdownEditor({ value, onChange, imageCategory, textareaRef, fileInputRef });
  const tabs = useEditorTabs();

  const isPreview = tabs.tab === 'preview';

  return (
    <FieldShell id={id} label={label} error={error}>
      <div
        className={cn(
          'overflow-hidden rounded border bg-white transition-colors',
          error === undefined ? 'border-gray-300 focus-within:border-primary' : 'border-danger',
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-default bg-light px-2 py-1.5">
          <EditorTabs
            fieldId={id}
            fieldLabel={label}
            tab={tabs.tab}
            onSelect={tabs.select}
            onKeyDown={tabs.onKeyDown}
          />

          {!isPreview && (
            <MarkdownToolbar
              buttons={editor.buttons}
              fieldLabel={label}
              disabled={disabled}
              isUploading={editor.isUploading}
              onAction={editor.onAction}
              activeIndex={editor.roving.activeIndex}
              onKeyDown={editor.roving.onKeyDown}
              onFocus={editor.roving.onFocus}
            />
          )}
        </div>

        {/* Панель исходника прячется, а не снимается: подпись поля указывает
            на область ввода, а выделение в ней переживает поход
            в предпросмотр. */}
        <div
          role="tabpanel"
          id={panelId(id, 'source')}
          aria-labelledby={tabId(id, 'source')}
          hidden={isPreview}
        >
          <textarea
            ref={textareaRef}
            id={id}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
            rows={18}
            aria-invalid={error !== undefined}
            aria-describedby={error === undefined ? undefined : errorId(id)}
            className="block w-full resize-y border-0 px-3 py-2 font-mono text-sm text-text-default focus:ring-0 disabled:opacity-60"
          />
        </div>

        <div
          role="tabpanel"
          id={panelId(id, 'preview')}
          aria-labelledby={tabId(id, 'preview')}
          hidden={!isPreview}
          className="min-h-80 px-4 py-3"
        >
          {isPreview &&
            (value.trim() === '' ? (
              <p className="text-base text-text-muted">Текст пуст — показывать нечего.</p>
            ) : (
              <Markdown text={value} />
            ))}
        </div>

        {/* Диалог выбора файла открывает кнопка панели, сам input спрятан
            и из обхода, и от диктора — как у rich-text редактора. */}
        {imageCategory !== undefined && (
          <input
            ref={fileInputRef}
            type="file"
            accept={IMAGE_ACCEPT}
            tabIndex={-1}
            aria-hidden="true"
            className="sr-only"
            onChange={editor.onFileChange}
          />
        )}
      </div>

      {/* Область объявлена заранее: диктор читает только то, что появилось
          в уже существующей живой области. */}
      <p role="status" className="text-sm text-text-muted">
        {editor.isUploading ? 'Загружаем картинку…' : ''}
      </p>

      {editor.uploadError && (
        <p role="alert" className="text-sm text-danger">
          {editor.uploadError}
        </p>
      )}
    </FieldShell>
  );
}
