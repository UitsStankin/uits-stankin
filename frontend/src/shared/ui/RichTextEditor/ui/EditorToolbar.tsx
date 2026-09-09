import type { FocusEvent, KeyboardEvent } from 'react';

import { cn } from '@shared/lib';

import { TOOLBAR_BUTTONS } from '../model/toolbarButtons';
import type { ToolbarAction, ToolbarState } from '../model/useRichTextEditor';

interface EditorToolbarProps {
  /**
   * Подпись поля — она входит в имя панели. Редакторов на форме бывает
   * несколько (у карточки ППС их два), и три панели «Форматирование»
   * подряд диктор читает одинаково.
   */
  fieldLabel: string;
  /** Что включено там, где стоит курсор. */
  state: ToolbarState;
  /** Открыта ли строка ввода адреса — для кнопки «Ссылка». */
  isLinkFormOpen: boolean;
  disabled: boolean;
  onAction: (action: ToolbarAction) => void;
  /** Кнопка в порядке табуляции; остальные достаются стрелками. */
  activeIndex: number;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  onFocus: (event: FocusEvent<HTMLDivElement>) => void;
}

/**
 * Панель форматирования. Чистая: состояние кнопок и поведение стрелок
 * приходят пропсами, набор кнопок — из `model/toolbarButtons.ts`.
 */
export function EditorToolbar({
  fieldLabel,
  state,
  isLinkFormOpen,
  disabled,
  onAction,
  activeIndex,
  onKeyDown,
  onFocus,
}: EditorToolbarProps) {
  return (
    <div
      role="toolbar"
      aria-label={`Форматирование: ${fieldLabel}`}
      aria-orientation="horizontal"
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      className="flex flex-wrap items-center gap-0.5 border-b border-default bg-light px-2 py-1.5"
    >
      {TOOLBAR_BUTTONS.map(({ action, label, icon: Icon, startsGroup }, index) => (
        <div key={action} className="flex items-center">
          {startsGroup && <span aria-hidden="true" className="mx-1 h-5 w-px bg-gray-300" />}

          <button
            type="button"
            // Панель стоит внутри формы записи: кнопка без типа отправила бы
            // форму, а не поставила курсив.
            onClick={() => onAction(action)}
            disabled={disabled}
            title={label}
            aria-label={label}
            // «Ссылка» не переключатель, а раскрытие строки ввода: диктору
            // важнее, что она открывает, чем то, что курсор стоит в ссылке.
            {...(action === 'link'
              ? { 'aria-expanded': isLinkFormOpen }
              : action === 'clear'
                ? {}
                : { 'aria-pressed': state[action] ?? false })}
            tabIndex={index === activeIndex ? 0 : -1}
            className={cn(
              'rounded p-1.5 text-text-default transition-colors',
              'hover:bg-gray-200 hover:text-text-heading',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent',
              // Нажатое состояние — не только рамкой: цвет фона читается
              // быстрее, а рамка занимала бы место и дёргала раскладку.
              (state[action] || (action === 'link' && isLinkFormOpen)) &&
                'bg-primary/10 text-primary',
            )}
          >
            <Icon aria-hidden="true" className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
