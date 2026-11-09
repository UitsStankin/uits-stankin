import { useLayoutEffect, useRef, type ChangeEvent, type RefObject } from 'react';

import { useImageUpload } from '@shared/api';
import type { FileCategory } from '@shared/types';
// Хук стрелочной навигации — общий с rich-text редактором. Файл лежит
// в его папке, но TipTap не тянет: ленивая граница проходит по `Editor.tsx`.
import { useToolbarRoving } from '@shared/ui/RichTextEditor/model/useToolbarRoving';

import { applyMarkdownCommand, insertImage, type TextSelection } from '../lib/markdownCommands';
import { MARKDOWN_TOOLBAR, type ToolbarAction } from './toolbarButtons';

interface MarkdownEditorOptions {
  value: string;
  onChange: (text: string) => void;
  /** Раздел хранилища для картинок; не задан — кнопки «Картинка» нет. */
  imageCategory?: FileCategory;
  /**
   * Область ввода и спрятанный выбор файла. Заводит их сборка, а не хук:
   * компилятор React считает ссылкой весь объект, в котором ссылка лежит,
   * и хук, вернувший их вместе с `isUploading`, запретил бы читать при
   * рендере и `isUploading` тоже.
   */
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  fileInputRef: RefObject<HTMLInputElement | null>;
}

/**
 * Поле правки Markdown: команды панели, выделение после них, загрузка
 * картинки. Разметка об этом ничего не знает.
 *
 * ### Текст — всегда из поля, а не из замыкания
 *
 * Команды читают текст и выделение прямо из `<textarea>`. Для кнопок
 * панели это то же самое, что `value` из пропсов, а для картинки — нет:
 * она вставляется, когда доехал ответ загрузки, а колбэк загрузки
 * запомнил `value` на момент выбора файла. Пока файл летел, человек мог
 * напечатать абзац, и вставка в запомненный текст стёрла бы его молча.
 *
 * ### Выделение после команды
 *
 * Новый текст уходит наверх в форму и возвращается пропсом, а управляемое
 * поле, получив новое значение, ставит курсор в конец. Поэтому выделение
 * запоминается до отправки и ставится в `useLayoutEffect` — после того,
 * как значение доехало до DOM, но до кадра, в котором человек увидел бы
 * прыжок курсора.
 */
export function useMarkdownEditor({
  value,
  onChange,
  imageCategory,
  textareaRef,
  fileInputRef,
}: MarkdownEditorOptions) {
  /** Выделение, которое поставить, когда новый текст доедет до поля. */
  const pendingSelection = useRef<{ start: number; end: number } | null>(null);

  const buttons =
    imageCategory === undefined
      ? MARKDOWN_TOOLBAR.filter((button) => button.action !== 'image')
      : MARKDOWN_TOOLBAR;

  const roving = useToolbarRoving(buttons.length);

  /** Поставить новый текст и выделение в поле. */
  function apply(next: TextSelection) {
    const textarea = textareaRef.current;

    if (textarea === null) return;

    // Текст не изменился — перерисовки не будет, и выделение ставится сразу.
    if (next.value === textarea.value) {
      textarea.focus();
      textarea.setSelectionRange(next.start, next.end);
      return;
    }

    pendingSelection.current = { start: next.start, end: next.end };

    if (!replaceUndoably(textarea, next.value)) onChange(next.value);
  }

  // Хук зовётся всегда — хуки не бывают условными; без раздела хранилища
  // до `select` дело просто не доходит: ни кнопки, ни поля выбора файла нет.
  const upload = useImageUpload(imageCategory ?? 'pages', ({ url }) => {
    const textarea = textareaRef.current;

    if (textarea === null) return;

    apply(
      insertImage(
        { value: textarea.value, start: textarea.selectionStart, end: textarea.selectionEnd },
        url,
      ),
    );
  });

  useLayoutEffect(() => {
    const selection = pendingSelection.current;
    const textarea = textareaRef.current;

    if (selection === null || textarea === null) return;

    pendingSelection.current = null;
    textarea.focus();
    textarea.setSelectionRange(selection.start, selection.end);
  }, [value, textareaRef]);

  return {
    buttons,
    roving,

    onAction: (action: ToolbarAction) => {
      // Диалог выбора файла — от кнопки панели; сам input спрятан.
      if (action === 'image') {
        fileInputRef.current?.click();
        return;
      }

      const textarea = textareaRef.current;

      if (textarea === null) return;

      apply(
        applyMarkdownCommand(action, {
          value: textarea.value,
          start: textarea.selectionStart,
          end: textarea.selectionEnd,
        }),
      );
    },

    onFileChange: (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];

      if (file) upload.select(file);

      // Тот же файл, выбранный второй раз (после отказа), должен снова
      // вызвать `change` — без сброса браузер промолчит.
      event.target.value = '';
    },

    isUploading: upload.isUploading,
    uploadError: upload.error,
  };
}

/**
 * Заменить текст поля так, чтобы правку отменял Ctrl+Z. `false` — заменить
 * так не вышло, и текст надо отдать форме напрямую.
 *
 * Присвоенное `value` браузер в историю правок не кладёт: после кнопки
 * панели Ctrl+Z либо ничего не делает, либо откатывает то, что человек
 * набирал до неё. `insertText` кладёт — поэтому правится через него, и только
 * середина, которой старый текст отличается от нового: отмена вернёт ровно
 * то, что сделала кнопка. Событие `input` браузер при этом шлёт сам, и новое
 * значение доезжает до формы обычным `onChange` поля.
 *
 * `execCommand` объявлен устаревшим, но другого способа положить правку
 * в историю поля у веб-платформы нет, и все браузеры портала его держат.
 * В jsdom его нет вовсе — там работает запасной путь, и тесты проверяют
 * именно его.
 */
function replaceUndoably(textarea: HTMLTextAreaElement, next: string): boolean {
  if (typeof document.execCommand !== 'function') return false;

  const current = textarea.value;

  let head = 0;
  while (head < current.length && head < next.length && current[head] === next[head]) head++;

  let tail = 0;
  while (
    tail < current.length - head &&
    tail < next.length - head &&
    current[current.length - 1 - tail] === next[next.length - 1 - tail]
  ) {
    tail++;
  }

  textarea.focus();
  textarea.setSelectionRange(head, current.length - tail);

  return document.execCommand('insertText', false, next.slice(head, next.length - tail));
}
