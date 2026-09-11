import type { FocusEvent, KeyboardEvent } from 'react';

import { cn } from '@shared/lib';

import type { ToolbarAction, ToolbarButton } from '../model/toolbarButtons';

interface MarkdownToolbarProps {
  /** Кнопки по порядку: сборка решает, есть ли среди них «Картинка». */
  buttons: readonly ToolbarButton[];
  /** Подпись поля — входит в имя панели, как у rich-text редактора. */
  fieldLabel: string;
  disabled: boolean;
  /** Картинка в пути: вторую до ответа не выбрать. */
  isUploading: boolean;
  onAction: (action: ToolbarAction) => void;
  /** Кнопка в порядке табуляции; остальные достаются стрелками. */
  activeIndex: number;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  onFocus: (event: FocusEvent<HTMLDivElement>) => void;
}

/**
 * Панель правки Markdown. Чистая: набор кнопок и поведение стрелок
 * приходят пропсами.
 *
 * Состояния «нажата» у кнопок нет, в отличие от rich-text панели:
 * там редактор знает, внутри какой разметки стоит курсор, а здесь
 * разметка — это символы исходника, и курсор между звёздочками ничего
 * не значит, пока текст не разобран. Кнопки поэтому объявлены действиями,
 * а не переключателями, хотя повторное нажатие и снимает разметку.
 */
export function MarkdownToolbar({
  buttons,
  fieldLabel,
  disabled,
  isUploading,
  onAction,
  activeIndex,
  onKeyDown,
  onFocus,
}: MarkdownToolbarProps) {
  return (
    <div
      role="toolbar"
      aria-label={`Форматирование: ${fieldLabel}`}
      aria-orientation="horizontal"
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      className="flex flex-wrap items-center gap-0.5"
    >
      {buttons.map(({ action, label, icon: Icon, startsGroup }, index) => (
        <div key={action} className="flex items-center">
          {startsGroup && <span aria-hidden="true" className="mx-1 h-5 w-px bg-gray-300" />}

          <button
            type="button"
            // Панель стоит внутри формы: кнопка без типа отправила бы форму.
            onClick={() => onAction(action)}
            disabled={disabled || (action === 'image' && isUploading)}
            title={label}
            aria-label={label}
            tabIndex={index === activeIndex ? 0 : -1}
            className={cn(
              'rounded p-1.5 text-text-default transition-colors',
              'hover:bg-gray-200 hover:text-text-heading',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent',
            )}
          >
            <Icon aria-hidden="true" className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
